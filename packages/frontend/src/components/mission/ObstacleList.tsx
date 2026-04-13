import { useState, useRef } from "react";
import { Triangle, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMissionStore } from "@/store/missionStore";
import { polygonArea, formatArea } from "@/lib/geo";

export function ObstacleList() {
  const { obstacles, selectedObstacleId, selectObstacle, removeObstacle, updateObstacle } = useMissionStore();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [expandedEditor, setExpandedEditor] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  if (obstacles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Triangle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No obstacles yet</p>
        <p className="text-xs mt-1">Use the "Obstacle" button to draw polygon obstacles</p>
      </div>
    );
  }

  const startRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingName(id);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitRename = (id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      updateObstacle(id, { name: trimmed });
    }
    setEditingName(null);
  };

  const toggleEditor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEditor((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      {obstacles.map((obstacle) => {
        const isSelected = selectedObstacleId === obstacle.id;
        const isRenaming = editingName === obstacle.id;
        const isEditorOpen = expandedEditor === obstacle.id;

        return (
          <div key={obstacle.id}>
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-red-500/20 border border-red-500/40"
                  : "hover:bg-secondary border border-transparent"
              }`}
              onClick={() => selectObstacle(isSelected ? null : obstacle.id)}
            >
              <Triangle className="h-3 w-3 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    ref={nameInputRef}
                    className="text-xs font-medium bg-transparent border-b border-red-400 outline-none w-full py-0"
                    defaultValue={obstacle.name}
                    autoFocus
                    onBlur={(e) => commitRename(obstacle.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(obstacle.id, e.currentTarget.value);
                      if (e.key === "Escape") setEditingName(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="text-xs font-medium truncate cursor-text hover:text-red-300 transition-colors"
                    onDoubleClick={(e) => startRename(obstacle.id, e)}
                    title="Double-click to rename"
                  >
                    {obstacle.name}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {obstacle.vertices.length} vertices &middot; {formatArea(polygonArea(obstacle.vertices))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 shrink-0 ${
                  isEditorOpen
                    ? "text-red-400 hover:text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={(e) => toggleEditor(obstacle.id, e)}
                title="Edit obstacle settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeObstacle(obstacle.id);
                }}
                title="Remove obstacle"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Inline editor */}
            {isEditorOpen && (
              <div className="ml-4 mr-1 mt-1 mb-2 border-l-2 border-red-400/30 bg-red-500/5 rounded-r-md p-3 space-y-2">
                <div>
                  <Label className="text-xs">Description</Label>
                  <textarea
                    value={obstacle.description}
                    onChange={(e) => updateObstacle(obstacle.id, { description: e.target.value })}
                    className="w-full h-16 text-xs rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Notes about this obstacle..."
                  />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {obstacle.vertices.length} vertices &middot; Right-click a vertex on the map to remove it
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
