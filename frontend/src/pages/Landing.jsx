import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Boxes, KeyRound, BarChart3, Shield, Zap, Code2, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/5f861933-c8a2-4990-8f25-2cd4a8f379a1/images/9e2dc6e5c8a9dc07a6ad7289a423f31b6676d32e205d983a4a0ef28da2927ba5.png";
const DATA_VIZ = "https://static.prod-images.emergentagent.com/jobs/5f861933-c8a2-4990-8f25-2cd4a8f379a1/images/437de0d506e96b4a8ba1f6387e3b95955e01a7f6cd486a607f8562b9d01a022a.png";

const FEATURES = [
  { icon: Boxes, title: "Register any API", desc: "Point MeterFlow at any HTTP target. We handle keys, quotas, and forwarding so your APIs ship monetized in minutes." },
  { icon: KeyRound, title: "Per-key rate limits", desc: "Sliding-window rate limiting with per-key throttles. Burst control built-in." },
  { icon: BarChart3, title: "Granular metering", desc: "Every call captured: timestamp, latency, status, billable amount. Aggregate to the millisecond." },
  { icon: Shield, title: "Signed payments", desc: "Razorpay checkout with HMAC signature verification. PCI never touches your servers." },
  { icon: Zap, title: "Sub-50ms gateway", desc: "Async forward path. MongoDB-backed limiter. Production-ready out of the box." },
  { icon: Code2, title: "Beginner friendly", desc: "Clean FastAPI + React codebase. Documented schemas. Forkable for your portfolio." },
];

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-8 h-8 bg-[#0052FF] flex items-center justify-center"><Activity className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
            <span className="font-display font-black text-lg tracking-tight">MeterFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" data-testid="header-login-btn" onClick={() => nav("/login")}>Sign in</Button>
            <Button className="bg-[#0052FF] hover:bg-[#003EB3] rounded-md" data-testid="header-cta-btn" onClick={() => nav("/signup")}>
              Start free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0A0A0A] text-white border-b border-slate-200">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 grid-bg-dark opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 rounded-full text-[10px] uppercase tracking-[0.25em] text-slate-300 mb-8">
            <span className="w-1.5 h-1.5 bg-[#0052FF] rounded-full" /> v1.0 — Production ready
          </div>
          <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter max-w-4xl">
            Meter every API call.<br />
            <span className="text-slate-400">Bill the way you want.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-slate-300 leading-relaxed">
            MeterFlow is the developer-first usage-based billing layer for any API.
            Validate keys, throttle traffic, log every request, and collect revenue —
            all behind a single gateway.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" className="bg-[#0052FF] hover:bg-[#003EB3] rounded-md text-base px-7 py-6" data-testid="hero-start-btn" onClick={() => nav("/signup")}>
              Build your gateway <ArrowRight className="w-5 h-5 ml-1.5" />
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white hover:text-slate-900 rounded-md text-base px-7 py-6" data-testid="hero-pricing-btn" onClick={() => nav("/pricing")}>
              See pricing
            </Button>
          </div>

          {/* terminal preview */}
          <div className="mt-16 max-w-3xl border border-white/10 bg-black rounded-md overflow-hidden font-mono text-[13px]">
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/10 bg-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <span className="ml-3 text-[10px] uppercase tracking-[0.25em] text-slate-400">request → meterflow gateway</span>
            </div>
            <pre className="p-5 leading-relaxed text-slate-200">
<span className="text-[#0052FF]">curl</span> https://meterflow.dev/api/gw/<span className="text-emerald-400">my-api</span>/users/42 \{"\n"}
  -H <span className="text-amber-300">"X-API-Key: mk_live_•••"</span>
              {"\n\n"}
<span className="text-slate-500"># 200 OK · 38ms · ₹0.50 metered · key rate=12/60</span>
            </pre>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 mb-16 items-end">
          <div className="lg:col-span-7">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Capabilities</div>
            <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight">Everything you need to monetize an API.</h2>
          </div>
          <p className="lg:col-span-5 text-slate-600 leading-relaxed">
            From key issuance to invoice generation, MeterFlow ships every primitive of a billing platform — wired together and ready for production traffic.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white p-8 hover:bg-slate-50 transition-colors group" data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center mb-5 group-hover:bg-[#0052FF] transition-colors">
                <f.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <h3 className="font-display font-bold text-xl mb-2 tracking-tight">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-slate-50 border-y border-slate-200 py-24">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">How it works</div>
            <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight mb-8">Four steps from idea to invoice.</h2>
            <ol className="space-y-6">
              {[
                ["01", "Register an API", "Add the target URL and pricing. We mint a slug like /gw/your-api."],
                ["02", "Create keys", "Issue per-tenant API keys with custom rate limits."],
                ["03", "Route traffic", "Every call hits the gateway. Validated, throttled, forwarded."],
                ["04", "Get paid", "Watch revenue accrue. Razorpay handles checkout & invoices."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-1.5 w-7">{n}</div>
                  <div className="flex-1 border-l-2 border-slate-900 pl-5">
                    <div className="font-display font-bold text-lg">{t}</div>
                    <p className="text-slate-600 text-sm mt-1">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="border border-slate-200 bg-[#0A0A0A] overflow-hidden">
            <img src={DATA_VIZ} alt="MeterFlow data" className="w-full opacity-90" />
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Pricing</div>
          <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight">Free to start. Pay as you scale.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
          {[
            { name: "Free", price: "₹0", quota: "10K req / month", featured: false, items: ["60 req / min", "Basic analytics", "Community support"] },
            { name: "Starter", price: "₹999", quota: "250K req / month", featured: true, items: ["300 req / min", "Detailed logs", "Email support"] },
            { name: "Pro", price: "₹4,999", quota: "2M req / month", featured: false, items: ["2K req / min", "Priority routing", "Webhooks"] },
          ].map((p) => (
            <div key={p.name} className={`p-8 ${p.featured ? "bg-slate-900 text-white" : "bg-white"}`} data-testid={`landing-plan-${p.name.toLowerCase()}`}>
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display font-bold text-xl tracking-tight">{p.name}</h3>
                {p.featured && <span className="text-[10px] uppercase tracking-[0.25em] bg-[#0052FF] px-2 py-0.5">Popular</span>}
              </div>
              <div className="font-display font-black text-4xl mt-3">{p.price}<span className="text-base font-normal text-slate-400">/mo</span></div>
              <div className={`text-sm mt-1 mb-6 ${p.featured ? "text-slate-400" : "text-slate-600"}`}>{p.quota}</div>
              <ul className="space-y-2.5 text-sm">
                {p.items.map(i => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0052FF]" /> {i}</li>
                ))}
              </ul>
              <Button onClick={() => nav("/signup")} className={`w-full mt-7 rounded-md ${p.featured ? "bg-[#0052FF] hover:bg-[#003EB3]" : "bg-slate-900 hover:bg-slate-800"} text-white`}>
                Get started
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A0A] text-white py-20 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight">Stop building billing.<br />Start metering revenue.</h2>
          <Button size="lg" className="mt-8 bg-[#0052FF] hover:bg-[#003EB3] rounded-md text-base px-8 py-6" data-testid="footer-cta-btn" onClick={() => nav("/signup")}>
            Create free account <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>© {new Date().getFullYear()} MeterFlow · Built for developers</div>
          <div className="font-mono text-xs">v1.0.0</div>
        </div>
      </footer>
    </div>
  );
}
