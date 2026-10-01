import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useAuth, useDB } from "@/lib/store";
import {
  bs,
  methodLabel,
  money,
  salePayments,
  uid,
  update,
  type PayMethod,
  type Payment,
  type SaleItem,
} from "@/lib/db";

type PayDraft = { method: PayMethod; amount: string; reference: string };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/ventas")({
  head: () => ({
    meta: [
      { title: "Ventas y facturación | Inventario+" },
      {
        name: "description",
        content: "Registra ventas en efectivo, divisas, pago móvil o transferencia y emite facturas imprimibles.",
      },
      { property: "og:title", content: "Ventas y facturación | Inventario+" },
      { property: "og:description", content: "Punto de venta con múltiples métodos de pago y facturas imprimibles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="ventas">
      <Ventas />
    </AppShell>
  ),
});

function Ventas() {
  const db = useDB();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [q, setQ] = useState("");
  const [customer, setCustomer] = useState("");
  const [docId, setDocId] = useState("");
  const [payments, setPayments] = useState<PayDraft[]>([{ method: "efectivo", amount: "", reference: "" }]);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const iva = subtotal * (db.settings.ivaPct / 100);
    return { subtotal, iva, total: subtotal + iva };
  }, [cart, db.settings.ivaPct]);

  const paid = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const remaining = totals.total - paid;

  function setPay(idx: number, patch: Partial<PayDraft>) {
    setPayments((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addPayment() {
    setPayments((ps) => {
      const base: PayDraft[] =
        ps.length === 1 && !ps[0]!.amount ? [{ ...ps[0]!, amount: totals.total.toFixed(2) }] : ps;
      const used = base.reduce((a, p) => a + (Number(p.amount) || 0), 0);
      const rest = Math.max(0, totals.total - used);
      return [...base, { method: "divisas", amount: rest > 0 ? rest.toFixed(2) : "", reference: "" }];
    });
  }

  const results = q
    ? db.products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  function add(productId: string) {
    const p = db.products.find((x) => x.id === productId);
    if (!p) return;
    setCart((c) => {
      const found = c.find((i) => i.productId === p.id);
      if (found) return c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { productId: p.id, name: p.name, qty: 1, price: p.price, cost: p.cost }];
    });
    setQ("");
  }

  function setQty(id: string, delta: number) {
    setCart((c) =>
      c.map((i) => (i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)),
    );
  }

  function checkout() {
    setError("");
    if (cart.length === 0) return setError("Agrega al menos un producto.");
    const finalPayments: Payment[] =
      payments.length === 1
        ? [{ method: payments[0].method, amount: totals.total, reference: payments[0].reference || undefined }]
        : payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0, reference: p.reference || undefined }));
    for (const p of finalPayments) {
      if (p.method === "pagomovil" && !/^\d{4}$/.test(p.reference ?? ""))
        return setError("Cada pago móvil requiere un número de referencia de 4 dígitos.");
      if (payments.length > 1 && p.amount <= 0) return setError("Indica el monto de cada forma de pago.");
    }
    if (payments.length > 1 && Math.abs(remaining) >= 0.005)
      return setError("La suma de los pagos debe ser igual al total.");
    for (const p of finalPayments) if (p.method !== "pagomovil") delete p.reference;
    for (const item of cart) {
      const p = db.products.find((x) => x.id === item.productId);
      if (p && p.stock < item.qty) return setError(`Stock insuficiente de ${item.name} (${p.stock} disponibles).`);
    }

    const id = uid();
    const firstRef = finalPayments.find((p) => p.reference)?.reference;
    update((d) => {
      const number = d.seq++;
      d.sales.unshift({
        id,
        number,
        date: new Date().toISOString(),
        customer: customer.trim() || "Consumidor final",
        docId: docId.trim(),
        items: cart,
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        method: finalPayments[0].method,
        ...(firstRef ? { reference: firstRef } : {}),
        payments: finalPayments,
        rate: d.settings.rate,
        userId: user!.id,
        userName: user!.name,
      });
      d.products = d.products.map((p) => {
        const item = cart.find((i) => i.productId === p.id);
        return item ? { ...p, stock: p.stock - item.qty } : p;
      });
    });
    setCart([]);
    setCustomer("");
    setDocId("");
    setPayments([{ method: "efectivo", amount: "", reference: "" }]);
    navigate({ to: "/factura/$id", params: { id } });
  }

  return (
    <>
      <PageTitle title="Ventas" subtitle={`Tasa de cambio: ${db.settings.rate} Bs/$ · IVA ${db.settings.ivaPct}%`} />

      <Tabs defaultValue="nueva">
        <TabsList className="mb-4">
          <TabsTrigger value="nueva">Nueva venta</TabsTrigger>
          <TabsTrigger value="registro">Registro</TabsTrigger>
        </TabsList>

        <TabsContent value="nueva" className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <Label>Buscar producto</Label>
            <Input className="mt-1.5" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o código…" />
            {results.length > 0 && (
              <ul className="mt-2 divide-y rounded-lg border">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-muted"
                      onClick={() => add(p.id)}
                    >
                      <span>
                        {p.name} <span className="text-xs text-muted-foreground">({p.stock} disp.)</span>
                      </span>
                      <span className="font-medium">{money(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2">
              {cart.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <ShoppingCart className="mx-auto mb-2 size-5" />
                  El carrito está vacío
                </p>
              )}
              {cart.map((i) => (
                <div key={i.productId} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{money(i.price)} c/u</p>
                  </div>
                  <Button size="icon" variant="outline" onClick={() => setQty(i.productId, -1)}>
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm">{i.qty}</span>
                  <Button size="icon" variant="outline" onClick={() => setQty(i.productId, 1)}>
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCart((c) => c.filter((x) => x.productId !== i.productId))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="h-fit rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold">Datos del cobro</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Consumidor final" />
              </div>
              <div className="space-y-1.5">
                <Label>C.I. / RIF</Label>
                <Input value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="V-12345678" />
              </div>
              <div className="space-y-2">
                <Label>Formas de pago</Label>
                {payments.map((p, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border p-2.5">
                    <div className="flex gap-2">
                      <select
                        className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                        value={p.method}
                        onChange={(e) => setPay(idx, { method: e.target.value as PayMethod, reference: "" })}
                      >
                        {(Object.keys(methodLabel) as PayMethod[]).map((m) => (
                          <option key={m} value={m}>
                            {methodLabel[m]}
                          </option>
                        ))}
                      </select>
                      {payments.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPayments((ps) => ps.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        value={p.amount}
                        onChange={(e) => setPay(idx, { amount: e.target.value })}
                        placeholder={payments.length === 1 ? totals.total.toFixed(2) : "Monto en $"}
                      />
                      {p.method === "pagomovil" && (
                        <Input
                          className="w-24"
                          inputMode="numeric"
                          maxLength={4}
                          value={p.reference}
                          onChange={(e) => setPay(idx, { reference: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                          placeholder="Ref."
                        />
                      )}
                    </div>
                    {Number(p.amount) > 0 && (
                      <p className="text-xs text-muted-foreground">≈ {bs(Number(p.amount), db.settings.rate)}</p>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={addPayment}>
                  <Plus className="size-3.5" /> Agregar otro método
                </Button>
                {payments.length > 1 && (
                  <p className={`text-xs ${Math.abs(remaining) < 0.005 ? "text-muted-foreground" : "text-destructive"}`}>
                    {remaining > 0.005
                      ? `Falta por pagar: ${money(remaining)}`
                      : remaining < -0.005
                        ? `Excede el total por ${money(-remaining)}`
                        : "Pago completo"}
                  </p>
                )}
              </div>
            </div>

            <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA {db.settings.ivaPct}%</dt>
                <dd>{money(totals.iva)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{money(totals.total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Equivalente en Bs</dt>
                <dd>{bs(totals.total, db.settings.rate)}</dd>
              </div>
            </dl>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <Button className="mt-4 w-full" onClick={checkout}>
              <Printer className="size-4" /> Cobrar y facturar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="registro">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">N°</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Pago</th>
                  <th className="p-3">Ref.</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {db.sales.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-mono text-xs">#{String(s.number).padStart(5, "0")}</td>
                    <td className="p-3">{new Date(s.date).toLocaleString("es-VE")}</td>
                    <td className="p-3">{s.customer}</td>
                    <td className="p-3">{salePayments(s).map((p) => methodLabel[p.method]).join(" + ")}</td>
                    <td className="p-3 font-mono">
                      {salePayments(s).map((p) => p.reference).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{s.userName}</td>
                    <td className="p-3 text-right font-medium">{money(s.total)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate({ to: "/factura/$id", params: { id: s.id } })}>
                        Factura
                      </Button>
                    </td>
                  </tr>
                ))}
                {db.sales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Aún no hay ventas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
