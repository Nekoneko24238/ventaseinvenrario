import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useAuth, useDB } from "@/lib/store";
import { hash, uid, update, type Role } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y roles | Inventario+" },
      { name: "description", content: "Crea usuarios con rol administrador, vendedor o contador y define sus permisos." },
      { property: "og:title", content: "Usuarios y roles | Inventario+" },
      { property: "og:description", content: "Control de acceso por roles a inventario, ventas y contabilidad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell area="usuarios">
      <Usuarios />
    </AppShell>
  ),
});

const ROLES: { value: Role; desc: string }[] = [
  { value: "admin", desc: "Acceso total: inventario, ventas, contabilidad y usuarios." },
  { value: "vendedor", desc: "Ventas y consulta de inventario (sin editar productos)." },
  { value: "contador", desc: "Contabilidad, registro de ventas y consulta de inventario." },
];

function Usuarios() {
  const db = useDB();
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [msg, setMsg] = useState("");

  async function addUser() {
    setMsg("");
    if (!name.trim() || !username.trim() || password.length < 6)
      return setMsg("Completa los datos. La contraseña debe tener al menos 6 caracteres.");
    if (db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase()))
      return setMsg("Ese nombre de usuario ya existe.");
    const passHash = await hash(password);
    update((d) => {
      d.users.push({ id: uid(), name, username: username.trim(), role, passHash, active: true });
    });
    setName("");
    setUsername("");
    setPassword("");
    setMsg("Usuario creado.");
  }

  async function resetPass(id: string) {
    const np = window.prompt("Nueva contraseña (mín. 6 caracteres)");
    if (!np || np.length < 6) return;
    const passHash = await hash(np);
    update((d) => {
      d.users = d.users.map((u) => (u.id === id ? { ...u, passHash } : u));
    });
    setMsg("Contraseña actualizada.");
  }

  return (
    <>
      <PageTitle title="Usuarios y roles" subtitle="Define quién ve inventario, ventas y contabilidad" />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="h-fit rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Nuevo usuario</h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Usuario</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      role === r.value ? "border-primary bg-secondary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium capitalize">{r.value}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <Button className="w-full" onClick={addUser}>
              <Plus className="size-4" /> Crear usuario
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Activo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {db.users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 font-mono text-xs">{u.username}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    <Switch
                      checked={u.active}
                      disabled={u.id === user?.id}
                      onCheckedChange={(v) =>
                        update((d) => {
                          d.users = d.users.map((x) => (x.id === u.id ? { ...x, active: v } : x));
                        })
                      }
                    />
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => resetPass(u.id)}>
                      Contraseña
                    </Button>
                    {u.id !== user?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          update((d) => {
                            d.users = d.users.filter((x) => x.id !== u.id);
                          });
                          if (u.id === user?.id) signOut();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
