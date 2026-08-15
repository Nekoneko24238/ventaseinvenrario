import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureAdmin, load, SESSION_KEY, type Role, type User } from "./db";

interface Ctx {
  ready: boolean;
  user: (User & { role: Role }) | null;
  refresh: number;
  signIn: (u: User) => void;
  signOut: () => void;
}

const AuthCtx = createContext<Ctx>({
  ready: false,
  user: null,
  refresh: 0,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    const bump = () => setRefresh((r) => r + 1);
    window.addEventListener("localdb", bump);
    ensureAdmin().then(() => {
      if (!mounted) return;
      const id = window.localStorage.getItem(SESSION_KEY);
      const found = id ? load().users.find((u) => u.id === id && u.active) : undefined;
      setUser(found ?? null);
      setReady(true);
    });
    return () => {
      mounted = false;
      window.removeEventListener("localdb", bump);
    };
  }, []);

  const signIn = (u: User) => {
    window.localStorage.setItem(SESSION_KEY, u.id);
    setUser(u);
  };
  const signOut = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ ready, user, refresh, signIn, signOut }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

/** Datos de la base local, re-leídos cuando cambia. */
export function useDB() {
  const { refresh, ready } = useAuth();
  const [db, setDb] = useState(() => load());
  useEffect(() => {
    setDb(load());
  }, [refresh, ready]);
  return db;
}
