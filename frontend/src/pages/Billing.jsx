import React, { useEffect, useState } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api } from "../lib/api";
import { Badge } from "../components/ui/badge";

export default function Billing() {
  const [items, setItems] = useState([]);
  useEffect(() => { (async () => setItems((await api.get("/billing/invoices")).data))(); }, []);

  return (
    <AppShell>
      <PageHeader testId="billing-header" title="Billing" subtitle="Invoices and payment history." />
      <div className="p-8">
        <div className="border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <th className="px-5 py-3 text-left">Invoice</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Razorpay Payment</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500 text-sm">No invoices yet.</td></tr>
              ) : items.map((i) => (
                <tr key={i.invoice_id} className="border-t border-slate-100" data-testid={`invoice-row-${i.invoice_id}`}>
                  <td className="px-5 py-3 font-mono text-xs">{i.invoice_id}</td>
                  <td className="px-5 py-3">{i.plan_name}</td>
                  <td className="px-5 py-3 text-right font-mono">₹{i.amount_inr.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{i.razorpay_payment_id}</td>
                  <td className="px-5 py-3">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-sm">{i.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
