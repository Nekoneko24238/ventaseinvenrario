import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useAuth, useDB } from "@/lib/store";
import { canEditInventory, money, uid, update, type Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario | Inventario+" },
      { name: "description", content: "Administra productos, costos, precios y niveles de stock mínimo." },
      { property: "og:title", content: "Inventario | Inventario+" },
      { property: "og:description", content: "Productos, costos, precios y stock mínimo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="inventario">
      <Inventario />
    </AppShell>
  ),
});

const empty: Product = { id: "", sku: "", name: "", category: "", cost: 0, price: 0, stock: 0, minStock: 0 };

function Inventario() {
  const db = useDB();
  const { user } = useAuth();
  const editable = canEditInventory(user?.role);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(empty);

  const list = db.products.filter((p) =>
    (p.name + p.sku + p.category).toLowerCase().includes(q.toLowerCase()),
  );

  function saveProduct() {
    update((d) => {
      if (form.id) {
        d.products = d.products.map((p) => (p.id === form.id ? form : p));
      } else {
        d.products.push({ ...form, id: uid() });
      }
    });
    setOpen(false);
    setForm(empty);
  }

  return (
    <>
      <PageTitle
        title="Inventario"
        subtitle={`${db.products.length} productos registrados`}
        action={
          editable ? (
            <Button
              onClick={() => {
                setForm(empty);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <Input
        placeholder="Buscar por nombre, código o categoría…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <div className="grid gap-3 md:hidden">
        {list.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.sku} · {p.category}
                </p>
              </div>
              <span
                className={`h-fit rounded-md px-2 py-1 text-xs font-medium ${
                  p.stock <= p.minStock ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {p.stock} u.
              </span>
            </div>
            <p className="mt-2 text-sm">
              Precio <strong>{money(p.price)}</strong> · Costo {money(p.cost)}
            </p>
            {editable && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(p); setOpen(true); }}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update((d) => { d.products = d.products.filter((x) => x.id !== p.id); })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-[var(--shadow-card)] md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Costo</th>
              <th className="p-3 text-right">Precio</th>
              <th className="p-3 text-right">Stock</th>
              {editable && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.category}</td>
                <td className="p-3 text-right">{money(p.cost)}</td>
                <td className="p-3 text-right">{money(p.price)}</td>
                <td className={`p-3 text-right font-medium ${p.stock <= p.minStock ? "text-destructive" : ""}`}>
                  {p.stock}
                </td>
                {editable && (
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => update((d) => { d.products = d.products.filter((x) => x.id !== p.id); })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Costo ($)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio ($)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Existencia</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveProduct} disabled={!form.name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
