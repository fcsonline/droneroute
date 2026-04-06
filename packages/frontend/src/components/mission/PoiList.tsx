import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMissionStore } from "@/store/missionStore";

export function PoiList() {
  const { pois, selectedPoiId, selectPoi, removePoi, updatePoi } = useMissionStore();

  if (pois.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Crosshair className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No POIs yet</p>
        <p className="text-xs mt-1">Use the "Add POI" button to place points of interest</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {pois.map((poi) => {
        const isSelected = selectedPoiId === poi.id;
        return (
          <div key={poi.id}>
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-destructive/20 border border-destructive/40"
                  : "hover:bg-secondary border border-transparent"
              }`}
              onClick={() => selectPoi(isSelected ? null : poi.id)}
            >
              <Crosshair className="h-3 w-3 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{poi.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {poi.latitude.toFixed(5)}, {poi.longitude.toFixed(5)}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {poi.height}m
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removePoi(poi.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Inline editor when selected */}
            {isSelected && (
              <div className="px-2 py-2 space-y-2 border-l-2 border-destructive/30 ml-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={poi.name}
                    onChange={(e) => updatePoi(poi.id, { name: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height (m)</Label>
                  <Input
                    type="number"
                    value={poi.height}
                    onChange={(e) => updatePoi(poi.id, { height: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div>Lat: {poi.latitude.toFixed(6)}</div>
                  <div>Lng: {poi.longitude.toFixed(6)}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
