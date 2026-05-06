import React, { useEffect, useState } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

function loadRzp() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(null);
  const { user, checkAuth } = useAuth();

  useEffect(() => { (async () => setPlans((await api.get("/plans")).data))(); }, []);

  const subscribe = async (plan) => {
    setBusy(plan.plan_id);
    try {
      if (plan.price_inr === 0) {
        await api.post("/billing/checkout", { plan_id: plan.plan_id });
        toast.success("Switched to Free plan");
        await checkAuth();
        return;
      }
      const ok = await loadRzp();
      if (!ok) { toast.error("Razorpay failed to load"); return; }
      const r = await api.post("/billing/checkout", { plan_id: plan.plan_id });
      const opts = {
        key: r.data.key_id,
        amount: r.data.amount,
        currency: r.data.currency,
        order_id: r.data.order_id,
        name: "MeterFlow",
        description: `${plan.name} plan subscription`,
        prefill: { name: r.data.user.name, email: r.data.user.email },
        theme: { color: "#0052FF" },
        handler: async (resp) => {
          try {
            await api.post("/billing/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              plan_id: plan.plan_id,
            });
            toast.success(`Subscribed to ${plan.name}`);
            await checkAuth();
          } catch (e) {
            toast.error("Verification failed");
          }
        },
      };
      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Checkout failed");
    } finally { setBusy(null); }
  };

  return (
    <AppShell>
      <PageHeader testId="pricing-header" title="Pricing" subtitle="Switch plans anytime. Pay only for what you ship." />
      <div className="p-8">
        <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 max-w-5xl">
          {plans.map((p) => {
            const featured = p.plan_id === "starter";
            const current = user?.plan_id === p.plan_id;
            return (
              <div key={p.plan_id} className={`p-7 ${featured ? "bg-slate-900 text-white" : "bg-white"}`} data-testid={`plan-card-${p.plan_id}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display font-bold text-xl tracking-tight">{p.name}</h3>
                  {featured && <span className="text-[10px] uppercase tracking-[0.25em] bg-[#0052FF] px-2 py-0.5">Popular</span>}
                </div>
                <div className="font-display font-black text-4xl mt-3">₹{p.price_inr.toLocaleString()}<span className="text-base font-normal text-slate-400">/mo</span></div>
                <div className={`text-xs font-mono mt-1 mb-5 ${featured ? "text-slate-400" : "text-slate-500"}`}>{p.monthly_quota.toLocaleString()} requests / month</div>
                <ul className="space-y-2 text-sm mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0052FF]" /> {f}</li>
                  ))}
                </ul>
                <Button
                  disabled={current || busy === p.plan_id}
                  onClick={() => subscribe(p)}
                  className={`w-full rounded-md ${featured ? "bg-[#0052FF] hover:bg-[#003EB3]" : "bg-slate-900 hover:bg-slate-800"} text-white`}
                  data-testid={`subscribe-${p.plan_id}`}
                >
                  {current ? "Current plan" : busy === p.plan_id ? "Loading..." : (p.price_inr === 0 ? "Switch to Free" : `Subscribe — ₹${p.price_inr}`)}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 font-mono mt-6">Test mode · Razorpay test card: 4111 1111 1111 1111 / any future expiry / any 3-digit CVV / any OTP.</p>
      </div>
    </AppShell>
  );
}
