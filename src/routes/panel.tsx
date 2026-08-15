import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useAuth, useDB } from "@/lib/store";
import { methodLabel, money, type PayMethod } from "@/lib/db";
import { AlertTriangle, Boxes, Receipt, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/panel")({
  head: () => ({
    meta: [
      { title: "Panel general | Inventario+" },
      { name: "description", content: "Resumen de ventas del día, inventario valorizado y alertas de stock bajo." },
      { property: "og:title", content: "Panel general | Inventario+" },
      { property: "og:description", content: "Resumen de ventas, inventario y alertas de stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="ventas">
      <Panel />
    </AppShell>
  ),
});

function Card({ label, value, icon: Icon, tone = "primary" }: { label: string; value: string; icon: React.ElementType; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`size-4 text-${tone}`} />
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Panel() {
  const db = useDB();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = db.sales.filter((s) => s.date.slice(0, 10) === today);
  const totalToday = todaySales.reduce((a, s) => a + s.total, 0);
  const stockValue = db.products.reduce((a, p) => a + p.cost * p.stock, 0);
  const low = db.products.filter((p) => p.stock <= p.minStock);

  const byMethod = todaySales.reduce<Record<string, number>>((acc, s) => {
    acc[s.method] = (acc[s.method] ?? 0) + s.total;
    return acc;
  }, {});

  return (
    <>
      <PageTitle title={`Hola, ${user?.name.split(" ")[0]}`} subtitle="Resumen de la operación de hoy" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Ventas hoy" value={money(totalToday)} icon={TrendingUp} />
        <Card label="Facturas hoy" value={String(todaySales.length)} icon={Receipt} />
        <Card label="Inventario (costo)" value={money(stockValue)} icon={Boxes} />
        <Card label="Stock bajo" value={String(low.length)} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Cobros de hoy por método</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Object.keys(methodLabel) as PayMethod[]).map((m) => (
              <li key={m} className="flex justify-between border-b pb-2 last:border-0">
                <span className="text-muted-foreground">{methodLabel[m]}</span>
                <span className="font-medium">{money(byMethod[m] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Productos por reponer</h2>
          {low.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todo el inventario está por encima del mínimo.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {low.map((p) => (
                <li key={p.id} className="flex justify-between border-b pb-2 last:border-0">
                  <span>{p.name}</span>
                  <span className="font-medium text-destructive">
                    {p.stock} / mín {p.minStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
