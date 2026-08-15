import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBackup, importBackup } from "@/lib/db";
import { toast } from "sonner";

export function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (mode === "replace" && !window.confirm("Esto reemplazará TODOS los datos actuales. ¿Continuar?")) return;
    try {
      await importBackup(file, mode);
      toast.success("Respaldo restaurado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer el archivo");
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold">Respaldo de datos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Descarga una copia en archivo JSON y guárdala en tu computadora. Puedes restaurarla en cualquier momento o en otro equipo.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={exportBackup} className="gap-2">
          <Download className="size-4" /> Exportar respaldo
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Importar respaldo
        </Button>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "replace" | "merge")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Modo de importación"
        >
          <option value="replace">Reemplazar todo</option>
          <option value="merge">Fusionar con lo actual</option>
        </select>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </div>
    </div>
  );
}
