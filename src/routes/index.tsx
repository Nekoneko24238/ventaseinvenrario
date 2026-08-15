import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { hash, load } from "@/lib/db";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventario+ | Control de inventario, ventas y contabilidad" },
      {
        name: "description",
        content:
          "Sistema local de inventario, ventas con efectivo, divisas y pago móvil, contabilidad y facturación con roles de usuario.",
      },
      { property: "og:title", content: "Inventario+ | Control de inventario, ventas y contabilidad" },
      {
        property: "og:description",
        content: "Sistema local de inventario, ventas con efectivo, divisas y pago móvil, contabilidad y facturación con roles de usuario.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user) navigate({ to: "/panel", replace: true });
  }, [ready, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const h = await hash(password);
    const found = load().users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passHash === h,
    );
    if (!found) return setError("Usuario o contraseña incorrectos.");
    if (!found.active) return setError("Este usuario está desactivado.");
    signIn(found);
    navigate({ to: "/panel" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold">Inventario+</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inventario, ventas, contabilidad y facturación. Todo guardado localmente en este equipo.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u">Usuario</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Contraseña</Label>
            <Input
              id="p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            <Lock className="size-4" /> Entrar
          </Button>
        </form>
      </div>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Acceso inicial: <strong>admin</strong> / <strong>admin123</strong>. Cámbialo desde la sección Usuarios.
      </p>
    </div>
  );
}
