import React from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";

export default function Settings() {
  const { user, logout } = useAuth();
  return (
    <AppShell>
      <PageHeader testId="settings-header" title="Settings" subtitle="Profile and account." />
      <div className="p-8 space-y-6 max-w-2xl">
        <div className="border border-slate-200 bg-white p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">Profile</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="col-span-1 text-slate-500">Name</div>
            <div className="col-span-2 font-medium" data-testid="settings-name">{user?.name}</div>
            <div className="col-span-1 text-slate-500">Email</div>
            <div className="col-span-2 font-mono text-xs" data-testid="settings-email">{user?.email}</div>
            <div className="col-span-1 text-slate-500">Plan</div>
            <div className="col-span-2 font-mono text-xs uppercase" data-testid="settings-plan">{user?.plan_id}</div>
            <div className="col-span-1 text-slate-500">User ID</div>
            <div className="col-span-2 font-mono text-xs text-slate-500">{user?.user_id}</div>
          </div>
        </div>
        <div className="border border-red-200 bg-red-50 p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-red-700 mb-2">Danger zone</div>
          <div className="font-display font-bold mb-3">Sign out of all sessions</div>
          <Button variant="destructive" className="rounded-md" onClick={logout} data-testid="settings-logout-btn">Sign out</Button>
        </div>
      </div>
    </AppShell>
  );
}
