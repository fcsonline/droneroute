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
        className="bg-background/90 backdrop-blur-sm"
      >
        <MousePointerClick className="h-4 w-4" />
        <span className="text-xs">Add WP</span>
        <kbd className="ml-1 text-[10px] opacity-60 bg-black/20 px-1 rounded">W</kbd>
      </Button>
      <Button
        variant={isAddingPoi ? "default" : "outline"}
        size="sm"
        onClick={() => setIsAddingPoi(true)}
        title="Click on map to add POI (P)"
        className="bg-background/90 backdrop-blur-sm"
      >
        <Crosshair className="h-4 w-4" />
        <span className="text-xs">Add POI</span>
        <kbd className="ml-1 text-[10px] opacity-60 bg-black/20 px-1 rounded">P</kbd>
      </Button>
      <Button
        variant={isPanning ? "default" : "outline"}
        size="sm"
        onClick={() => {
          setIsAddingWaypoint(false);
          setIsAddingPoi(false);
        }}
        title="Pan / select mode (Esc)"
        className="bg-background/90 backdrop-blur-sm"
      >
        <Hand className="h-4 w-4" />
        <span className="text-xs">Pan</span>
        <kbd className="ml-1 text-[10px] opacity-60 bg-black/20 px-1 rounded">Esc</kbd>
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
