import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { update } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración | Inventario+" },
      { name: "description", content: "Ajusta la tasa de cambio, el IVA y los datos fiscales del negocio." },
      { property: "og:title", content: "Configuración | Inventario+" },
      { property: "og:description", content: "Configura tasa de cambio, IVA y datos del negocio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="usuarios">
      <Configuracion />
    </AppShell>
  ),
});

function Configuracion() {
  const db = useDB();
  const [form, setForm] = useState(db.settings);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    update((d) => {
      d.settings = {
        business: form.business.trim() || "Mi Negocio C.A.",
        rif: form.rif.trim() || "J-00000000-0",
        address: form.address.trim() || "Caracas, Venezuela",
        phone: form.phone.trim() || "0412-0000000",
        ivaPct: Math.max(0, Number(form.ivaPct) || 0),
        rate: Math.max(0.01, Number(form.rate) || 0.01),
      };
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <PageTitle
        title="Configuración"
        subtitle="Actualiza la tasa del dólar, el IVA y los datos fiscales."
        action={<Settings className="size-5 text-muted-foreground" />}
      />

      <form onSubmit={save} className="mx-auto max-w-xl rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="business">Nombre del negocio</Label>
            <Input
              id="business"
              value={form.business}
              onChange={(e) => setForm((f) => ({ ...f, business: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rif">RIF</Label>
              <Input
                id="rif"
                value={form.rif}
                onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rate">Tasa de cambio Bs/$</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0.01"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Valor del dólar en bolívares.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iva">IVA (%)</Label>
              <Input
                id="iva"
                type="number"
                step="0.1"
                min="0"
                value={form.ivaPct}
                onChange={(e) => setForm((f) => ({ ...f, ivaPct: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit">Guardar cambios</Button>
          {saved && <span className="text-sm text-green-600">Guardado correctamente</span>}
        </div>
      </form>
    </>
  );
}
