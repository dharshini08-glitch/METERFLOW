import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

const DATA_VIZ = "https://static.prod-images.emergentagent.com/jobs/5f861933-c8a2-4990-8f25-2cd4a8f379a1/images/437de0d506e96b4a8ba1f6387e3b95955e01a7f6cd486a607f8562b9d01a022a.png";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="bg-white p-8 lg:p-16 flex flex-col">
        <Link to="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900" data-testid="back-home-link">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-10">
              <div className="w-8 h-8 bg-[#0052FF] flex items-center justify-center"><Activity className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
              <span className="font-display font-black text-lg">MeterFlow</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Sign in</div>
            <h1 className="font-display font-black text-4xl tracking-tighter mb-2">Welcome back.</h1>
            <p className="text-slate-600 mb-8 text-sm">Sign in to your MeterFlow console.</p>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-md border-slate-300 hover:bg-slate-50 mb-4"
              onClick={googleLogin}
              data-testid="google-login-btn"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">or</div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] font-semibold">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 rounded-md" data-testid="login-email-input" />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] font-semibold">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 rounded-md" data-testid="login-password-input" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-[#0052FF] hover:bg-[#003EB3] rounded-md py-6" data-testid="login-submit-btn">
                {busy ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="text-sm text-slate-600 mt-6 text-center">
              No account? <Link to="/signup" className="text-[#0052FF] font-medium" data-testid="goto-signup-link">Create one</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute inset-0 grid-bg-dark opacity-30" />
        <img src={DATA_VIZ} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/30 to-transparent" />
        <div className="relative h-full flex items-end p-12 text-white">
          <div className="max-w-md">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-3">Trusted by builders</div>
            <p className="font-display font-bold text-2xl tracking-tight leading-snug">
              "MeterFlow turned our internal API into a paid product in one weekend."
            </p>
            <div className="font-mono text-xs text-slate-400 mt-4">— @founder, indie SaaS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
