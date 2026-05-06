import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Boxes, KeyRound, ScrollText, CreditCard, Receipt, Settings, LogOut, Activity } from "lucide-react";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
  { to: "/endpoints", label: "APIs", icon: Boxes, tid: "nav-apis" },
  { to: "/keys", label: "API Keys", icon: KeyRound, tid: "nav-keys" },
  { to: "/logs", label: "Logs", icon: ScrollText, tid: "nav-logs" },
  { to: "/pricing", label: "Pricing", icon: CreditCard, tid: "nav-pricing" },
  { to: "/billing", label: "Billing", icon: Receipt, tid: "nav-billing" },
  { to: "/settings", label: "Settings", icon: Settings, tid: "nav-settings" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 sticky top-0 h-screen flex flex-col" data-testid="app-sidebar">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="w-8 h-8 bg-[#0052FF] flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black text-lg leading-none">MeterFlow</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">Console</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, tid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={tid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-display font-bold text-sm overflow-hidden">
              {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0]?.toUpperCase() || "U")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 truncate">{user?.plan_id} plan</div>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white py-2 rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, testId }) {
  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10" data-testid={testId}>
      <div className="px-8 py-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1.5">MeterFlow / {title}</div>
          <h1 className="font-display font-black text-3xl tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-600 mt-1.5 text-sm">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
