// Base de datos 100% local (navegador). Sin servidor ni nube.
export type Role = "admin" | "vendedor" | "contador";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  passHash: string;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost: number; // Bs
  price: number; // Bs
  stock: number;
  minStock: number;
}

export type PayMethod = "efectivo" | "divisas" | "pagomovil" | "transferencia";

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
}

export interface Sale {
  id: string;
  number: number;
  date: string;
  customer: string;
  docId: string;
  items: SaleItem[];
  subtotal: number;
  iva: number;
  total: number;
  method: PayMethod; // método principal (primer pago)
  reference?: string; // pago móvil: 4 dígitos
  payments?: Payment[]; // pagos combinados
  rate: number; // Bs por USD al momento de la venta
  userId: string;
  userName: string;
}

export interface Payment {
  method: PayMethod;
  amount: number; // $
  reference?: string | undefined;
}

/** Pagos de una venta (compatible con ventas antiguas de un solo método). */
export const salePayments = (s: Sale): Payment[] =>
  s.payments && s.payments.length > 0
    ? s.payments
    : [{ method: s.method, amount: s.total, reference: s.reference }];

export interface Expense {
  id: string;
  date: string;
  concept: string;
  category: string;
  amount: number;
}

export interface Settings {
  business: string;
  rif: string;
  address: string;
  phone: string;
  ivaPct: number;
  rate: number;
}

interface DB {
  users: User[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  settings: Settings;
  seq: number;
}

const KEY = "inv_local_db_v1";
export const SESSION_KEY = "inv_local_session_v1";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function hash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function seed(): DB {
  return {
    users: [],
    products: [],
    sales: [],
    expenses: [],
    seq: 1,
    settings: {
      business: "Mi Negocio C.A.",
      rif: "J-00000000-0",
      address: "Caracas, Venezuela",
      phone: "0412-0000000",
      ivaPct: 16,
      rate: 36,
    },
  };
}

export function load(): DB {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return seed();
  try {
    return { ...seed(), ...(JSON.parse(raw) as DB) };
  } catch {
    return seed();
  }
}

export function save(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("localdb"));
}

export function update(fn: (db: DB) => void) {
  const db = load();
  fn(db);
  save(db);
  return db;
}

/** Crea el usuario administrador inicial si la base está vacía. */
export async function ensureAdmin() {
  const db = load();
  if (db.users.length > 0) return;
  db.users.push({
    id: uid(),
    username: "admin",
    name: "Administrador",
    role: "admin",
    passHash: await hash("admin123"),
    active: true,
  });
  if (db.products.length === 0) {
    db.products = [
      { id: uid(), sku: "P-001", name: "Harina de maíz 1kg", category: "Alimentos", cost: 0.5, price: 0.8, stock: 40, minStock: 10 },
      { id: uid(), sku: "P-002", name: "Café molido 500g", category: "Alimentos", cost: 1.5, price: 2.3, stock: 18, minStock: 6 },
      { id: uid(), sku: "P-003", name: "Detergente 1L", category: "Limpieza", cost: 0.9, price: 1.4, stock: 8, minStock: 10 },
    ];
  }
  save(db);
}

/** Moneda principal del sistema: dólares. */
export const money = (n: number) =>
  "$ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const usd = money;

/** Equivalente en bolívares según la tasa. */
export const bs = (n: number, rate: number) =>
  "Bs " + (n * (rate || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const methodLabel: Record<PayMethod, string> = {
  efectivo: "Efectivo (Bs)",
  divisas: "Divisas ($)",
  pagomovil: "Pago Móvil",
  transferencia: "Transferencia",
};

export const can = (role: Role | undefined, area: "inventario" | "ventas" | "contabilidad" | "usuarios") => {
  if (!role) return false;
  if (role === "admin") return true;
  if (role === "vendedor") return area === "inventario" || area === "ventas";
  if (role === "contador") return area !== "usuarios";
  return false;
};

export const canEditInventory = (role?: Role) => role === "admin";

/* ---------- Respaldo local (exportar / importar JSON) ---------- */

export function exportBackup() {
  const db = load();
  const payload = { app: "inventario-local", version: 1, exportedAt: new Date().toISOString(), data: db };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respaldo-inventario-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Restaura un respaldo. mode "replace" sustituye todo; "merge" fusiona por id. */
export async function importBackup(file: File, mode: "replace" | "merge" = "replace") {
  const text = await file.text();
  const parsed = JSON.parse(text) as { data?: DB } & Partial<DB>;
  const incoming = (parsed.data ?? parsed) as DB;
  if (!incoming || !Array.isArray(incoming.products) || !Array.isArray(incoming.sales)) {
    throw new Error("El archivo no tiene el formato de respaldo esperado.");
  }
  if (mode === "replace") {
    save({ ...seed(), ...incoming });
    return;
  }
  const current = load();
  const mergeById = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map((x) => [x.id, x]));
    b.forEach((x) => map.set(x.id, x));
    return Array.from(map.values());
  };
  save({
    ...current,
    users: mergeById(current.users, incoming.users ?? []),
    products: mergeById(current.products, incoming.products ?? []),
    sales: mergeById(current.sales, incoming.sales ?? []),
    expenses: mergeById(current.expenses, incoming.expenses ?? []),
    settings: { ...current.settings, ...(incoming.settings ?? {}) },
    seq: Math.max(current.seq, incoming.seq ?? 1),
  });
}
