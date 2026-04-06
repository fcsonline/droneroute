import { useState, useRef } from "react";
import { MapPin, X, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMissionStore } from "@/store/missionStore";
import { WaypointEditorInline } from "./WaypointEditor";

export function WaypointList() {
  const { waypoints, selectedWaypointIndex, selectWaypoint, removeWaypoint, reorderWaypoints } =
    useMissionStore();

  const [expandedEditor, setExpandedEditor] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  if (waypoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <MapPin className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No waypoints yet</p>
        <p className="text-xs mt-1">Click on the map to add waypoints</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragItemRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderWaypoints(fromIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const toggleEditor = (wpIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEditor((prev) => (prev === wpIndex ? null : wpIndex));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      {waypoints.map((wp, i) => {
        const isSelected = selectedWaypointIndex === wp.index;
        const isDragging = dragIndex === i;
        const isDragOver = dragOverIndex === i;
        const isEditorOpen = expandedEditor === wp.index;

        return (
          <div key={wp.index}>
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                isDragging
                  ? "opacity-40"
                  : isDragOver
                    ? "border-t-2 border-primary"
                    : isSelected
                      ? "bg-primary/20 border border-primary/40"
                      : "hover:bg-secondary border border-transparent"
              }`}
              onClick={() => selectWaypoint(wp.index)}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
              <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {wp.index + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {wp.height}m &middot; {wp.speed}m/s
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                </div>
              </div>
              {wp.actions.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {wp.actions.length}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 shrink-0 ${
                  isEditorOpen
                    ? "text-primary hover:text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={(e) => toggleEditor(wp.index, e)}
                title="Edit waypoint settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWaypoint(wp.index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {isEditorOpen && (
              <div className="ml-4 mr-1 mt-1 mb-2 border-l-2 border-blue-400/30 bg-blue-500/5 rounded-r-md">
                <WaypointEditorInline waypointIndex={wp.index} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
