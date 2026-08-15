import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { methodLabel, money, uid, update, type PayMethod } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contabilidad")({
  head: () => ({
    meta: [
      { title: "Contabilidad | Inventario+" },
      { name: "description", content: "Libro de ingresos, gastos, IVA débito fiscal y utilidad por período." },
      { property: "og:title", content: "Contabilidad | Inventario+" },
      { property: "og:description", content: "Ingresos, costos, gastos, IVA y utilidad neta del negocio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="contabilidad">
      <Contabilidad />
    </AppShell>
  ),
});

function Contabilidad() {
  const db = useDB();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("Operativo");
  const [amount, setAmount] = useState(0);

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const sales = db.sales.filter((s) => inRange(s.date));
  const expenses = db.expenses.filter((e) => inRange(e.date));

  const r = useMemo(() => {
    const gross = sales.reduce((a, s) => a + s.subtotal, 0);
    const iva = sales.reduce((a, s) => a + s.iva, 0);
    const cogs = sales.reduce((a, s) => a + s.items.reduce((b, i) => b + i.cost * i.qty, 0), 0);
    const exp = expenses.reduce((a, e) => a + e.amount, 0);
    const byMethod = sales.reduce<Record<string, number>>((acc, s) => {
      acc[s.method] = (acc[s.method] ?? 0) + s.total;
      return acc;
    }, {});
    return { gross, iva, cogs, exp, profit: gross - cogs - exp, byMethod };
  }, [sales, expenses]);

  function addExpense() {
    if (!concept.trim() || amount <= 0) return;
    update((d) => {
      d.expenses.unshift({ id: uid(), date: new Date().toISOString(), concept, category, amount });
    });
    setConcept("");
    setAmount(0);
  }

  return (
    <>
      <PageTitle title="Contabilidad" subtitle="Ingresos, costos, gastos e IVA" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Ingresos (base)", r.gross],
          ["IVA débito fiscal", r.iva],
          ["Costo de ventas", r.cogs],
          ["Gastos", r.exp],
          ["Utilidad neta", r.profit],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label as string}</p>
            <p className={`mt-1 text-lg font-semibold ${(value as number) < 0 ? "text-destructive" : ""}`}>
              {money(value as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Cobros por método</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Object.keys(methodLabel) as PayMethod[]).map((m) => (
              <li key={m} className="flex justify-between border-b pb-2 last:border-0">
                <span className="text-muted-foreground">{methodLabel[m]}</span>
                <span className="font-medium">{money(r.byMethod[m] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Registrar gasto</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Concepto</Label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Alquiler, servicios…" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Monto (Bs)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
          </div>
          <Button className="mt-3" onClick={addExpense}>
            <Plus className="size-4" /> Agregar gasto
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Concepto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{new Date(e.date).toLocaleDateString("es-VE")}</td>
                <td className="p-3">{e.concept}</td>
                <td className="p-3 text-muted-foreground">{e.category}</td>
                <td className="p-3 text-right">{money(e.amount)}</td>
                <td className="p-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => update((d) => { d.expenses = d.expenses.filter((x) => x.id !== e.id); })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Sin gastos en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
