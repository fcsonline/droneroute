import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export interface Warning {
  id: string;
  type: "battery" | "obstacle";
  message: string;
}

interface WarningsPanelProps {
  warnings: Warning[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (warnings.length === 0) return null;

  const visible = warnings.filter((w) => !dismissed.has(w.id));
  if (visible.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-1.5 pointer-events-none max-w-[600px] w-full px-4">
      {visible.map((w) => (
        <div
          key={w.id}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-orange-400 bg-orange-600/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-orange-100 shrink-0" />
          <span className="flex-1">{w.message}</span>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(w.id))}
            className="shrink-0 text-orange-200/70 hover:text-white transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
