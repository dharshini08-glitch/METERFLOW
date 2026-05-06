"""
MeterFlow — Usage-based API billing & metering platform
FastAPI + MongoDB backend. All routes prefixed with /api.
"""
import os
import uuid
import time
import hmac
import hashlib
import secrets
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Dict

import bcrypt
import jwt
import httpx
import razorpay
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# -------------------- Config --------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGO = "HS256"
JWT_EXP_DAYS = 7
RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

rzp_client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET)) if RZP_KEY_ID else None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("meterflow")

app = FastAPI(title="MeterFlow API")
api = APIRouter(prefix="/api")

# -------------------- Models --------------------
class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class SessionExchangeReq(BaseModel):
    session_id: str

class APICreate(BaseModel):
    name: str
    target_url: str
    free_quota: int = 1000
    price_per_call_inr: float = 0.5
    description: Optional[str] = ""

class APIUpdate(BaseModel):
    name: Optional[str] = None
    target_url: Optional[str] = None
    free_quota: Optional[int] = None
    price_per_call_inr: Optional[float] = None
    description: Optional[str] = None

class KeyCreate(BaseModel):
    api_id: str
    label: Optional[str] = "default"
    rate_limit_per_min: int = 60

class CheckoutReq(BaseModel):
    plan_id: str

class VerifyPaymentReq(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


# -------------------- Helpers --------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXP_DAYS * 86400,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_jwt(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return data.get("sub")
    except Exception:
        return None

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

async def current_user(request: Request) -> Dict[str, Any]:
    """Resolve user from either JWT (Authorization: Bearer) or session_token cookie."""
    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        user_id = decode_jwt(token)
        if not user_id:
            # Maybe Emergent session_token
            sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
            if sess:
                exp = sess.get("expires_at")
                if isinstance(exp, str):
                    exp = datetime.fromisoformat(exp)
                if exp and (exp.tzinfo is None):
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp and exp > now_utc():
                    user_id = sess["user_id"]

    if not user_id:
        cookie = request.cookies.get("session_token")
        if cookie:
            sess = await db.user_sessions.find_one({"session_token": cookie}, {"_id": 0})
            if sess:
                exp = sess.get("expires_at")
                if isinstance(exp, str):
                    exp = datetime.fromisoformat(exp)
                if exp and (exp.tzinfo is None):
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp and exp > now_utc():
                    user_id = sess["user_id"]

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def slugify(s: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-") or "api"


# -------------------- Plans seeding --------------------
DEFAULT_PLANS = [
    {
        "plan_id": "free",
        "name": "Free",
        "price_inr": 0,
        "monthly_quota": 10000,
        "rate_limit_per_min": 60,
        "features": ["10K requests / month", "60 req/min", "Basic analytics", "Community support"],
    },
    {
        "plan_id": "starter",
        "name": "Starter",
        "price_inr": 999,
        "monthly_quota": 250000,
        "rate_limit_per_min": 300,
        "features": ["250K requests / month", "300 req/min", "Detailed logs", "Email support"],
    },
    {
        "plan_id": "pro",
        "name": "Pro",
        "price_inr": 4999,
        "monthly_quota": 2000000,
        "rate_limit_per_min": 2000,
        "features": ["2M requests / month", "2K req/min", "Priority routing", "Webhooks", "Priority support"],
    },
]

async def ensure_plans():
    for p in DEFAULT_PLANS:
        await db.plans.update_one({"plan_id": p["plan_id"]}, {"$set": p}, upsert=True)

# -------------------- Auth Routes --------------------
@api.post("/auth/signup")
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "password_hash": hash_password(req.password),
        "picture": None,
        "plan_id": "free",
        "created_at": now_utc().isoformat(),
        "auth_provider": "password",
    }
    await db.users.insert_one(user)
    token = make_jwt(user_id)
    return {
        "token": token,
        "user": {"user_id": user_id, "email": user["email"], "name": user["name"], "plan_id": "free"},
    }

@api.post("/auth/login")
async def login(req: LoginReq):
    u = await db.users.find_one({"email": req.email.lower()})
    if not u or not u.get("password_hash"):
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(req.password, u["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_jwt(u["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": u["user_id"],
            "email": u["email"],
            "name": u["name"],
            "plan_id": u.get("plan_id", "free"),
            "picture": u.get("picture"),
        },
    }

@api.post("/auth/session")
async def emergent_session(req: SessionExchangeReq, response: Response):
    """Exchange Emergent session_id for our session_token. Sets httpOnly cookie."""
    async with httpx.AsyncClient(timeout=10) as cx:
        r = await cx.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email.split("@")[0]),
            "picture": data.get("picture"),
            "plan_id": "free",
            "created_at": now_utc().isoformat(),
            "auth_provider": "google",
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", user["name"]), "picture": data.get("picture")}},
        )

    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": now_utc().isoformat(),
        }
    )
    response.set_cookie(
        "session_token",
        session_token,
        max_age=7 * 86400,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": user.get("name"),
            "picture": user.get("picture"),
            "plan_id": user.get("plan_id", "free"),
        },
        "token": session_token,
    }

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    cookie = request.cookies.get("session_token")
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        tok = auth.split(" ", 1)[1].strip()
        await db.user_sessions.delete_many({"session_token": tok})
    if cookie:
        await db.user_sessions.delete_many({"session_token": cookie})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# -------------------- APIs CRUD --------------------
@api.get("/apis")
async def list_apis(user: dict = Depends(current_user)):
    items = await db.apis.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.post("/apis")
async def create_api(req: APICreate, user: dict = Depends(current_user)):
    api_id = f"api_{uuid.uuid4().hex[:12]}"
    base_slug = slugify(req.name)
    slug = base_slug
    n = 1
    while await db.apis.find_one({"slug": slug}):
        n += 1
        slug = f"{base_slug}-{n}"
    doc = {
        "api_id": api_id,
        "user_id": user["user_id"],
        "name": req.name,
        "slug": slug,
        "target_url": req.target_url.rstrip("/"),
        "free_quota": req.free_quota,
        "price_per_call_inr": req.price_per_call_inr,
        "description": req.description or "",
        "created_at": now_utc().isoformat(),
        "active": True,
    }
    await db.apis.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/apis/{api_id}")
async def update_api(api_id: str, req: APIUpdate, user: dict = Depends(current_user)):
    doc = await db.apis.find_one({"api_id": api_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(404, "API not found")
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.apis.update_one({"api_id": api_id}, {"$set": update})
    out = await db.apis.find_one({"api_id": api_id}, {"_id": 0})
    return out

@api.delete("/apis/{api_id}")
async def delete_api(api_id: str, user: dict = Depends(current_user)):
    res = await db.apis.delete_one({"api_id": api_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "API not found")
    await db.api_keys.delete_many({"api_id": api_id})
    return {"ok": True}


# -------------------- API Keys --------------------
def gen_api_key() -> tuple[str, str]:
    raw = "mk_" + secrets.token_urlsafe(28)
    prefix = raw[:11]
    return raw, prefix

@api.get("/keys")
async def list_keys(user: dict = Depends(current_user)):
    items = await db.api_keys.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.post("/keys")
async def create_key(req: KeyCreate, user: dict = Depends(current_user)):
    api_doc = await db.apis.find_one({"api_id": req.api_id, "user_id": user["user_id"]})
    if not api_doc:
        raise HTTPException(404, "API not found")
    raw, prefix = gen_api_key()
    key_id = f"key_{uuid.uuid4().hex[:12]}"
    doc = {
        "key_id": key_id,
        "user_id": user["user_id"],
        "api_id": req.api_id,
        "api_name": api_doc["name"],
        "api_slug": api_doc["slug"],
        "label": req.label or "default",
        "key": raw,  # Plaintext (so user can copy). For prod, hash and show once.
        "prefix": prefix,
        "rate_limit_per_min": req.rate_limit_per_min,
        "status": "active",
        "created_at": now_utc().isoformat(),
        "last_used_at": None,
        "request_count": 0,
    }
    await db.api_keys.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/keys/{key_id}/revoke")
async def revoke_key(key_id: str, user: dict = Depends(current_user)):
    res = await db.api_keys.update_one(
        {"key_id": key_id, "user_id": user["user_id"]}, {"$set": {"status": "revoked"}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Key not found")
    return {"ok": True}

@api.delete("/keys/{key_id}")
async def delete_key(key_id: str, user: dict = Depends(current_user)):
    res = await db.api_keys.delete_one({"key_id": key_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Key not found")
    return {"ok": True}


# -------------------- Demo APIs (gateway forwards to these) --------------------
DEMO_JOKES = [
    {"id": 1, "joke": "Why do programmers prefer dark mode? Because light attracts bugs."},
    {"id": 2, "joke": "There are 10 types of people: those who understand binary and those who don't."},
    {"id": 3, "joke": "I told my computer I needed a break. It said: 'No problem — I'll go to sleep.'"},
    {"id": 4, "joke": "Debugging: being the detective in a crime movie where you are also the murderer."},
]
DEMO_QUOTES = [
    {"q": "Talk is cheap. Show me the code.", "a": "Linus Torvalds"},
    {"q": "First, solve the problem. Then, write the code.", "a": "John Johnson"},
    {"q": "Programs must be written for people to read.", "a": "Harold Abelson"},
]

@api.get("/demo/joke")
async def demo_joke():
    import random
    return random.choice(DEMO_JOKES)

@api.get("/demo/quote")
async def demo_quote():
    import random
    return random.choice(DEMO_QUOTES)


# -------------------- Gateway --------------------
async def check_rate_limit(key_doc: dict) -> bool:
    """Sliding 60s window using MongoDB rate_limits collection."""
    now = now_utc()
    window_start = now - timedelta(seconds=60)
    await db.rate_limits.delete_many({"ts": {"$lt": window_start.isoformat()}})
    count = await db.rate_limits.count_documents(
        {"key_id": key_doc["key_id"], "ts": {"$gte": window_start.isoformat()}}
    )
    if count >= key_doc.get("rate_limit_per_min", 60):
        return False
    await db.rate_limits.insert_one({"key_id": key_doc["key_id"], "ts": now.isoformat()})
    return True


@api.api_route("/gw/{slug}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def gateway(slug: str, path: str, request: Request):
    started = time.perf_counter()
    api_key = request.headers.get("x-api-key") or request.query_params.get("api_key", "")
    if not api_key:
        return JSONResponse({"error": "Missing X-API-Key header"}, status_code=401)

    key_doc = await db.api_keys.find_one({"key": api_key}, {"_id": 0})
    if not key_doc or key_doc.get("status") != "active":
        return JSONResponse({"error": "Invalid or revoked API key"}, status_code=401)

    api_doc = await db.apis.find_one({"slug": slug, "api_id": key_doc["api_id"]}, {"_id": 0})
    if not api_doc:
        return JSONResponse({"error": "API not found or key/API mismatch"}, status_code=404)

    # Rate limit
    if not await check_rate_limit(key_doc):
        latency = int((time.perf_counter() - started) * 1000)
        await log_request(api_doc, key_doc, request.method, path, 429, latency)
        return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)

    # Forward
    target = api_doc["target_url"].rstrip("/") + "/" + path
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as cx:
            method = request.method
            headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "x-api-key", "authorization", "cookie")}
            params = dict(request.query_params)
            params.pop("api_key", None)
            body = await request.body()
            r = await cx.request(method, target, headers=headers, params=params, content=body)
        latency = int((time.perf_counter() - started) * 1000)
        await log_request(api_doc, key_doc, method, path, r.status_code, latency)
        ctype = r.headers.get("content-type", "application/json")
        return Response(content=r.content, status_code=r.status_code, media_type=ctype)
    except Exception as e:
        latency = int((time.perf_counter() - started) * 1000)
        await log_request(api_doc, key_doc, request.method, path, 502, latency)
        return JSONResponse({"error": "Upstream error", "detail": str(e)}, status_code=502)


async def log_request(api_doc, key_doc, method: str, path: str, status: int, latency_ms: int):
    log_doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": api_doc["user_id"],
        "api_id": api_doc["api_id"],
        "api_name": api_doc["name"],
        "key_id": key_doc["key_id"],
        "key_prefix": key_doc["prefix"],
        "method": method,
        "path": path,
        "status_code": status,
        "latency_ms": latency_ms,
        "timestamp": now_utc().isoformat(),
        "billable": status < 500,
        "price_inr": api_doc.get("price_per_call_inr", 0) if status < 500 else 0,
    }
    await db.requests_log.insert_one(log_doc)
    await db.api_keys.update_one(
        {"key_id": key_doc["key_id"]},
        {"$set": {"last_used_at": log_doc["timestamp"]}, "$inc": {"request_count": 1}},
    )


# -------------------- Stats --------------------
@api.get("/stats/overview")
async def stats_overview(user: dict = Depends(current_user)):
    uid = user["user_id"]
    total = await db.requests_log.count_documents({"user_id": uid})
    errors = await db.requests_log.count_documents({"user_id": uid, "status_code": {"$gte": 400}})
    active_keys = await db.api_keys.count_documents({"user_id": uid, "status": "active"})
    apis_count = await db.apis.count_documents({"user_id": uid})

    # Revenue = sum of price_inr in successful requests this month
    month_start = now_utc().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pipeline = [
        {"$match": {"user_id": uid, "timestamp": {"$gte": month_start.isoformat()}, "billable": True}},
        {"$group": {"_id": None, "revenue": {"$sum": "$price_inr"}, "count": {"$sum": 1}}},
    ]
    rev_cur = db.requests_log.aggregate(pipeline)
    revenue = 0
    requests_this_month = 0
    async for d in rev_cur:
        revenue = d.get("revenue", 0)
        requests_this_month = d.get("count", 0)

    # Avg latency (last 1000)
    cur = db.requests_log.find({"user_id": uid}, {"_id": 0, "latency_ms": 1}).sort("timestamp", -1).limit(1000)
    lats = [d["latency_ms"] async for d in cur if "latency_ms" in d]
    avg_latency = round(sum(lats) / len(lats), 1) if lats else 0

    return {
        "total_requests": total,
        "errors": errors,
        "error_rate": round((errors / total * 100), 2) if total else 0,
        "active_keys": active_keys,
        "apis_count": apis_count,
        "revenue_inr": round(revenue, 2),
        "requests_this_month": requests_this_month,
        "avg_latency_ms": avg_latency,
    }

@api.get("/stats/timeseries")
async def stats_timeseries(user: dict = Depends(current_user), days: int = 7):
    uid = user["user_id"]
    start = now_utc() - timedelta(days=days)
    cur = db.requests_log.find(
        {"user_id": uid, "timestamp": {"$gte": start.isoformat()}},
        {"_id": 0, "timestamp": 1, "status_code": 1, "latency_ms": 1},
    )
    buckets: Dict[str, Dict[str, int]] = {}
    async for d in cur:
        ts = d["timestamp"][:10] if days >= 2 else d["timestamp"][:13]
        b = buckets.setdefault(ts, {"requests": 0, "errors": 0, "latency_sum": 0})
        b["requests"] += 1
        if d.get("status_code", 0) >= 400:
            b["errors"] += 1
        b["latency_sum"] += d.get("latency_ms", 0)

    # Fill missing buckets with zeros
    points = []
    for i in range(days):
        d = (now_utc() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        b = buckets.get(d, {"requests": 0, "errors": 0, "latency_sum": 0})
        avg = round(b["latency_sum"] / b["requests"], 1) if b["requests"] else 0
        points.append({"date": d, "requests": b["requests"], "errors": b["errors"], "avg_latency": avg})
    return points

@api.get("/stats/logs")
async def stats_logs(
    user: dict = Depends(current_user),
    limit: int = 100,
    api_id: Optional[str] = None,
    status: Optional[int] = None,
):
    q: Dict[str, Any] = {"user_id": user["user_id"]}
    if api_id:
        q["api_id"] = api_id
    if status:
        q["status_code"] = status
    cur = db.requests_log.find(q, {"_id": 0}).sort("timestamp", -1).limit(min(limit, 500))
    return await cur.to_list(500)

@api.get("/stats/by-api")
async def stats_by_api(user: dict = Depends(current_user)):
    uid = user["user_id"]
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {
            "_id": "$api_id",
            "api_name": {"$first": "$api_name"},
            "requests": {"$sum": 1},
            "errors": {"$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}},
            "revenue": {"$sum": {"$cond": ["$billable", "$price_inr", 0]}},
        }},
        {"$sort": {"requests": -1}},
    ]
    out = []
    async for d in db.requests_log.aggregate(pipeline):
        out.append({
            "api_id": d["_id"],
            "api_name": d.get("api_name", "Unknown"),
            "requests": d["requests"],
            "errors": d["errors"],
            "revenue_inr": round(d.get("revenue", 0), 2),
        })
    return out


# -------------------- Plans & Billing --------------------
@api.get("/plans")
async def list_plans():
    plans = await db.plans.find({}, {"_id": 0}).to_list(50)
    plans.sort(key=lambda p: p.get("price_inr", 0))
    return plans

@api.post("/billing/checkout")
async def checkout(req: CheckoutReq, user: dict = Depends(current_user)):
    if not rzp_client:
        raise HTTPException(500, "Payments not configured")
    plan = await db.plans.find_one({"plan_id": req.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan["price_inr"] == 0:
        # Free plan — just upgrade
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"plan_id": "free"}})
        return {"free": True}

    amount_paise = int(plan["price_inr"]) * 100
    receipt = f"rcpt_{user['user_id'][-8:]}_{int(time.time())}"[:40]
    order = rzp_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"user_id": user["user_id"], "plan_id": plan["plan_id"]},
    })
    return {
        "key_id": RZP_KEY_ID,
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "plan": plan,
        "user": {"name": user["name"], "email": user["email"]},
    }

@api.post("/billing/verify")
async def verify_payment(req: VerifyPaymentReq, user: dict = Depends(current_user)):
    if not rzp_client:
        raise HTTPException(500, "Payments not configured")
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
    expected = hmac.new(RZP_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(400, "Invalid signature")

    plan = await db.plans.find_one({"plan_id": req.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")

    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice = {
        "invoice_id": invoice_id,
        "user_id": user["user_id"],
        "plan_id": plan["plan_id"],
        "plan_name": plan["name"],
        "amount_inr": plan["price_inr"],
        "status": "paid",
        "razorpay_order_id": req.razorpay_order_id,
        "razorpay_payment_id": req.razorpay_payment_id,
        "created_at": now_utc().isoformat(),
    }
    await db.invoices.insert_one(invoice)
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$set": {"plan_id": plan["plan_id"]}}
    )
    invoice.pop("_id", None)
    return invoice

@api.get("/billing/invoices")
async def list_invoices(user: dict = Depends(current_user)):
    items = await db.invoices.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


# -------------------- Bootstrap --------------------
@app.on_event("startup")
async def startup():
    await ensure_plans()
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.apis.create_index("slug", unique=True)
    await db.api_keys.create_index("key", unique=True)
    await db.requests_log.create_index([("user_id", 1), ("timestamp", -1)])
    log.info("MeterFlow ready. Plans seeded.")

@app.on_event("shutdown")
async def shutdown():
    mongo.close()


@api.get("/")
async def root():
    return {"service": "MeterFlow", "status": "ok"}


# Mount router & CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
