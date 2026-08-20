import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BarChart3, Boxes, Calculator, Cog, LogOut, Receipt, Users } from "lucide-react";
import { useAuth } from "@/lib/store";
import { can } from "@/lib/db";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/panel", label: "Panel", icon: BarChart3, area: "ventas" as const },
  { to: "/inventario", label: "Inventario", icon: Boxes, area: "inventario" as const },
  { to: "/ventas", label: "Ventas", icon: Receipt, area: "ventas" as const },
  { to: "/contabilidad", label: "Contabilidad", icon: Calculator, area: "contabilidad" as const },
  { to: "/usuarios", label: "Usuarios", icon: Users, area: "usuarios" as const },
  { to: "/configuracion", label: "Configuración", icon: Cog, area: "usuarios" as const },
];

export function AppShell({ area, children }: { area: "inventario" | "ventas" | "contabilidad" | "usuarios"; children: ReactNode }) {
  const { user, ready, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  if (!can(user.role, area)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu rol ({user.role}) no tiene permiso para esta sección.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/panel" })}>
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => can(user.role, n.area));

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="no-print bg-sidebar text-sidebar-foreground md:min-h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-display text-base font-semibold">Inventario+</p>
            <p className="text-xs text-sidebar-foreground/60">Base de datos local</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Cerrar sesión"
            className="text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            onClick={signOut}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {items.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="no-print hidden border-t border-sidebar-border p-3 md:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="mb-2 text-xs capitalize text-sidebar-foreground/60">{user.role}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
