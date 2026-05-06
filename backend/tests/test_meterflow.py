"""MeterFlow backend test suite - comprehensive API testing via pytest."""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env
_env = Path(__file__).parent.parent.parent / "frontend" / ".env"
for line in _env.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
        break

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]
TEST_EMAIL = f"test_{UNIQUE}@example.com"
TEST_PASSWORD = "StrongPass!23"
TEST_NAME = f"TEST_User_{UNIQUE}"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def ctx():
    return {}


# -------- Health --------
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# -------- Auth --------
def test_signup(session, ctx):
    r = session.post(f"{API}/auth/signup",
                     json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["token"]
    assert data["user"]["email"] == TEST_EMAIL.lower()
    assert data["user"]["plan_id"] == "free"
    ctx["token"] = data["token"]
    ctx["user_id"] = data["user"]["user_id"]


def test_signup_duplicate_email(session):
    r = session.post(f"{API}/auth/signup",
                     json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "dup"})
    assert r.status_code == 400


def test_login(session, ctx):
    r = session.post(f"{API}/auth/login",
                     json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200
    d = r.json()
    assert "token" in d and d["token"]
    ctx["token"] = d["token"]  # refresh to latest


def test_login_bad_password(session):
    r = session.post(f"{API}/auth/login",
                     json={"email": TEST_EMAIL, "password": "WrongPass"})
    assert r.status_code == 401


def test_me(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/auth/me", headers=h)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == TEST_EMAIL.lower()
    assert "password_hash" not in d
    assert "_id" not in d


def test_me_unauthenticated(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


# -------- Plans --------
def test_plans(session):
    r = session.get(f"{API}/plans")
    assert r.status_code == 200
    plans = r.json()
    ids = {p["plan_id"] for p in plans}
    assert {"free", "starter", "pro"}.issubset(ids)


# -------- APIs CRUD --------
def test_create_api(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    payload = {
        "name": f"TEST_DJoke_{UNIQUE}",
        "target_url": f"{API}/demo/joke",
        "price_per_call_inr": 0.5,
        "free_quota": 1000,
        "description": "test demo joke api",
    }
    r = session.post(f"{API}/apis", json=payload, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == payload["name"]
    assert d["slug"]
    assert "_id" not in d
    ctx["api_id"] = d["api_id"]
    ctx["slug"] = d["slug"]


def test_list_apis(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/apis", headers=h)
    assert r.status_code == 200
    assert any(a["api_id"] == ctx["api_id"] for a in r.json())


def test_update_api(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.put(f"{API}/apis/{ctx['api_id']}",
                    json={"description": "updated desc"}, headers=h)
    assert r.status_code == 200
    assert r.json()["description"] == "updated desc"


# -------- Keys --------
def test_create_key(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.post(f"{API}/keys",
                     json={"api_id": ctx["api_id"], "label": "test", "rate_limit_per_min": 60},
                     headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["key"].startswith("mk_")
    assert d["status"] == "active"
    ctx["key"] = d["key"]
    ctx["key_id"] = d["key_id"]


def test_list_keys(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/keys", headers=h)
    assert r.status_code == 200
    assert any(k["key_id"] == ctx["key_id"] for k in r.json())


# -------- Demo endpoints --------
def test_demo_joke(session):
    r = session.get(f"{API}/demo/joke")
    assert r.status_code == 200
    assert "joke" in r.json()


def test_demo_quote(session):
    r = session.get(f"{API}/demo/quote")
    assert r.status_code == 200
    assert "q" in r.json()


# -------- Gateway --------
def test_gateway_missing_key(session, ctx):
    r = session.get(f"{API}/gw/{ctx['slug']}/")
    assert r.status_code == 401


def test_gateway_invalid_key(session, ctx):
    r = session.get(f"{API}/gw/{ctx['slug']}/", headers={"X-API-Key": "mk_invalid_key_xyz"})
    assert r.status_code == 401


def test_gateway_forwards(session, ctx):
    r = session.get(f"{API}/gw/{ctx['slug']}/", headers={"X-API-Key": ctx["key"]})
    assert r.status_code == 200, r.text
    assert "joke" in r.json()


def test_stats_logs_has_entry(session, ctx):
    time.sleep(0.5)
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/stats/logs", headers=h)
    assert r.status_code == 200
    logs = r.json()
    assert any(l["api_id"] == ctx["api_id"] for l in logs)


# -------- Rate limit (create new low-limit key) --------
def test_rate_limit_429(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.post(f"{API}/keys",
                     json={"api_id": ctx["api_id"], "label": "ratetest", "rate_limit_per_min": 2},
                     headers=h)
    assert r.status_code == 200
    key = r.json()["key"]
    ctx["rate_key_id"] = r.json()["key_id"]
    statuses = []
    for _ in range(5):
        resp = session.get(f"{API}/gw/{ctx['slug']}/", headers={"X-API-Key": key})
        statuses.append(resp.status_code)
    assert 429 in statuses, f"Expected 429 in {statuses}"


# -------- Revoke key --------
def test_revoke_key(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    # create a fresh key to revoke
    r = session.post(f"{API}/keys",
                     json={"api_id": ctx["api_id"], "label": "revtest", "rate_limit_per_min": 60},
                     headers=h)
    kid = r.json()["key_id"]
    raw = r.json()["key"]
    rv = session.post(f"{API}/keys/{kid}/revoke", headers=h)
    assert rv.status_code == 200
    # gateway should reject
    gw = session.get(f"{API}/gw/{ctx['slug']}/", headers={"X-API-Key": raw})
    assert gw.status_code == 401


# -------- Stats --------
def test_stats_overview(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/stats/overview", headers=h)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_requests", "errors", "active_keys", "apis_count", "revenue_inr", "avg_latency_ms"):
        assert k in d


def test_stats_timeseries(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/stats/timeseries", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 7


def test_stats_by_api(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/stats/by-api", headers=h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# -------- Billing --------
def test_checkout_free(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.post(f"{API}/billing/checkout", json={"plan_id": "free"}, headers=h)
    assert r.status_code == 200
    assert r.json().get("free") is True


def test_checkout_starter_razorpay(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.post(f"{API}/billing/checkout", json={"plan_id": "starter"}, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("key_id", "").startswith("rzp_test_")
    assert d.get("order_id", "").startswith("order_")
    assert d["amount"] == 999 * 100


def test_invoices_empty(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.get(f"{API}/billing/invoices", headers=h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# -------- Cleanup + Logout --------
def test_delete_key(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.delete(f"{API}/keys/{ctx['key_id']}", headers=h)
    assert r.status_code == 200


def test_delete_api(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.delete(f"{API}/apis/{ctx['api_id']}", headers=h)
    assert r.status_code == 200


def test_logout(session, ctx):
    h = {"Authorization": f"Bearer {ctx['token']}"}
    r = session.post(f"{API}/auth/logout", headers=h)
    assert r.status_code == 200
