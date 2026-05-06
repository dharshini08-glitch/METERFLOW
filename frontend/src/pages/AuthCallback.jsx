import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { nav("/login"); return; }
    const sid = m[1];

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id: sid });
        if (r.data?.token) localStorage.setItem("mf_token", r.data.token);
        if (r.data?.user) setUser(r.data.user);
        window.history.replaceState({}, "", "/dashboard");
        nav("/dashboard", { replace: true, state: { user: r.data?.user } });
      } catch {
        nav("/login");
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="font-display font-black text-2xl tracking-tight">Signing you in…</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-2">MeterFlow</div>
      </div>
    </div>
  );
}
