import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { bs, methodLabel, money, salePayments } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/factura/$id")({
  head: () => ({
    meta: [
      { title: "Factura | Inventario+" },
      { name: "description", content: "Factura detallada lista para imprimir con datos fiscales y forma de pago." },
      { property: "og:title", content: "Factura | Inventario+" },
      { property: "og:description", content: "Factura imprimible con detalle de productos, IVA y forma de pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="ventas">
      <Factura />
    </AppShell>
  ),
});

function Factura() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const sale = db.sales.find((s) => s.id === id);

  if (!sale) return <p className="text-sm text-muted-foreground">Factura no encontrada.</p>;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/ventas" })}>
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <div className="print-area mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-lg font-semibold">{db.settings.business}</h1>
            <p className="text-xs text-muted-foreground">RIF: {db.settings.rif}</p>
            <p className="text-xs text-muted-foreground">{db.settings.address}</p>
            <p className="text-xs text-muted-foreground">Tel: {db.settings.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-sm font-semibold">FACTURA</p>
            <p className="font-mono text-lg">#{String(sale.number).padStart(5, "0")}</p>
            <p className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleString("es-VE")}</p>
          </div>
        </div>

        <div className="grid gap-2 py-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Cliente: </span>
            {sale.customer}
          </p>
          <p>
            <span className="text-muted-foreground">C.I./RIF: </span>
            {sale.docId || "—"}
          </p>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Forma de pago: </span>
            {salePayments(sale).map((p, idx) => (
              <span key={idx} className="mr-3 inline-block">
                {methodLabel[p.method]} {money(p.amount)}
                {p.method === "efectivo" || p.method === "pagomovil" || p.method === "transferencia"
                  ? ` (${bs(p.amount, sale.rate)})`
                  : ""}
                {p.reference ? ` · Ref. ${p.reference}` : ""}
              </span>
            ))}
          </div>
          <p>
            <span className="text-muted-foreground">Atendido por: </span>
            {sale.userName}
          </p>
          <p>
            <span className="text-muted-foreground">Tasa: </span>
            {sale.rate} Bs/$
          </p>
        </div>

        <table className="w-full text-sm">
          <thead className="border-y text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Descripción</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">P. Unit.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.productId} className="border-b">
                <td className="py-2">{i.name}</td>
                <td className="py-2 text-center">{i.qty}</td>
                <td className="py-2 text-right">{money(i.price)}</td>
                <td className="py-2 text-right">{money(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{money(sale.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">IVA</dt>
            <dd>{money(sale.iva)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(sale.total)}</dd>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <dt>Equivalente en Bs</dt>
            <dd>{bs(sale.total, sale.rate)}</dd>
          </div>
        </dl>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Gracias por su compra. Documento generado localmente por Inventario+.
        </p>
      </div>
    </>
  );
}
