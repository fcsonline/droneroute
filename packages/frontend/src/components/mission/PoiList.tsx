import { useState, useRef } from "react";
import { Crosshair, X, Settings, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMissionStore } from "@/store/missionStore";
import { useUnitSystem } from "@/store/unitsStore";
import {
  altUnit,
  fmtAlt,
  displayAlt,
  displayToM,
  ALT_MIN,
  ALT_STEP,
} from "@/lib/units";

export function PoiList() {
  const { pois, selectedPoiId, selectPoi, removePoi, updatePoi } =
    useMissionStore();
  const sys = useUnitSystem();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [expandedEditor, setExpandedEditor] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  if (pois.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Crosshair className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No POIs yet</p>
        <p className="text-xs mt-1">
          Use the "Add POI" button to place points of interest
        </p>
      </div>
    );
  }

  const startRename = (poiId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingName(poiId);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitRename = (poiId: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      updatePoi(poiId, { name: trimmed });
    }
    setEditingName(null);
  };

  const toggleEditor = (poiId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEditor((prev) => (prev === poiId ? null : poiId));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      {pois.map((poi) => {
        const isSelected = selectedPoiId === poi.id;
        const isRenaming = editingName === poi.id;
        const isEditorOpen = expandedEditor === poi.id;

        return (
          <div key={poi.id}>
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-amber-500/20 border border-amber-500/40"
                  : "hover:bg-secondary border border-transparent"
              }`}
              onClick={() => selectPoi(isSelected ? null : poi.id)}
            >
              <Crosshair className="h-3 w-3 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    ref={nameInputRef}
                    className="text-xs font-medium bg-transparent border-b border-amber-400 outline-none w-full py-0"
                    defaultValue={poi.name}
                    autoFocus
                    onBlur={(e) => commitRename(poi.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        commitRename(poi.id, e.currentTarget.value);
                      if (e.key === "Escape") setEditingName(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="text-xs font-medium truncate cursor-text hover:text-amber-300 transition-colors"
                    onDoubleClick={(e) => startRename(poi.id, e)}
                    title="Double-click to rename"
                  >
                    {poi.name}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <ArrowUp className="h-2.5 w-2.5" />
                  {fmtAlt(poi.height, sys)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 shrink-0 ${
                  isEditorOpen
                    ? "text-amber-400 hover:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={(e) => toggleEditor(poi.id, e)}
                title="Edit POI settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removePoi(poi.id);
                }}
                title="Remove POI"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Inline editor */}
            {isEditorOpen && (
              <div className="ml-4 mr-1 mt-1 mb-2 border-l-2 border-amber-400/30 bg-amber-500/5 rounded-r-md p-3 space-y-2">
                <div>
                  <Label className="text-xs">Height ({altUnit(sys)})</Label>
                  <Input
                    type="number"
                    value={displayAlt(poi.height, sys)}
                    onChange={(e) =>
                      updatePoi(poi.id, {
                        height: displayToM(
                          parseFloat(e.target.value) || 0,
                          sys,
                        ),
                      })
                    }
                    min={ALT_MIN(sys)}
                    step={ALT_STEP(sys)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
