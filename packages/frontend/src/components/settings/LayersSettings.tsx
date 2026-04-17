import { useAirspaceStore } from "@/store/airspaceStore";

export function LayersSettings() {
  const enabled = useAirspaceStore((s) => s.enabled);
  const setEnabled = useAirspaceStore((s) => s.setEnabled);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Toggle map overlay layers.</p>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded border-border accent-primary"
        />
        <div>
          <span className="text-sm">Airspace restrictions</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">ENAIRE zones for Spain — prohibited and restricted areas</p>
        </div>
      </label>
    </div>
  );
}
