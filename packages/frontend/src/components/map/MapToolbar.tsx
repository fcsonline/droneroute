import { MousePointerClick, Hand, Trash2, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/store/missionStore";

export function MapToolbar() {
  const {
    isAddingWaypoint,
    isAddingPoi,
    setIsAddingWaypoint,
    setIsAddingPoi,
    waypoints,
    pois,
    clearMission,
  } = useMissionStore();

  const isPanning = !isAddingWaypoint && !isAddingPoi;

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Button
        variant={isAddingWaypoint ? "default" : "outline"}
        size="sm"
        onClick={() => setIsAddingWaypoint(true)}
        title="Click on map to add waypoints (W)"
        className="bg-background/90 backdrop-blur-sm justify-between"
      >
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="h-4 w-4" />
          <span className="text-xs">Add WP</span>
        </span>
        <kbd className="text-[10px] font-mono font-bold border border-white/20 bg-white/10 px-1.5 py-0.5 rounded text-foreground/80">W</kbd>
      </Button>
      <Button
        variant={isAddingPoi ? "default" : "outline"}
        size="sm"
        onClick={() => setIsAddingPoi(true)}
        title="Click on map to add POI (P)"
        className="bg-background/90 backdrop-blur-sm justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Crosshair className="h-4 w-4" />
          <span className="text-xs">Add POI</span>
        </span>
        <kbd className="text-[10px] font-mono font-bold border border-white/20 bg-white/10 px-1.5 py-0.5 rounded text-foreground/80">P</kbd>
      </Button>
      <Button
        variant={isPanning ? "default" : "outline"}
        size="sm"
        onClick={() => {
          setIsAddingWaypoint(false);
          setIsAddingPoi(false);
        }}
        title="Pan / select mode (Esc)"
        className="bg-background/90 backdrop-blur-sm justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Hand className="h-4 w-4" />
          <span className="text-xs">Pan</span>
        </span>
        <kbd className="text-[10px] font-mono font-bold border border-white/20 bg-white/10 px-1.5 py-0.5 rounded text-foreground/80">Esc</kbd>
      </Button>
      {(waypoints.length > 0 || pois.length > 0) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Clear all waypoints and POIs?")) clearMission();
          }}
          title="Clear all waypoints and POIs"
          className="bg-background/90 backdrop-blur-sm text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Clear</span>
        </Button>
      )}
    </div>
  );
}
