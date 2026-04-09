import { Plus, X, Camera, Video, VideoOff, RotateCcw, Compass, Clock, ZoomIn, Focus, MoveDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMissionStore } from "@/store/missionStore";
import type { ActionType, WaypointAction } from "@droneroute/shared";

const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: "takePhoto", label: "Take photo", icon: <Camera className="h-3 w-3" /> },
  { value: "startRecord", label: "Start recording", icon: <Video className="h-3 w-3" /> },
  { value: "stopRecord", label: "Stop recording", icon: <VideoOff className="h-3 w-3" /> },
  { value: "gimbalRotate", label: "Gimbal rotate", icon: <RotateCcw className="h-3 w-3" /> },
  { value: "gimbalEvenlyRotate", label: "Gimbal smooth", icon: <MoveDown className="h-3 w-3" /> },
  { value: "rotateYaw", label: "Rotate yaw", icon: <Compass className="h-3 w-3" /> },
  { value: "hover", label: "Hover", icon: <Clock className="h-3 w-3" /> },
  { value: "zoom", label: "Zoom", icon: <ZoomIn className="h-3 w-3" /> },
  { value: "focus", label: "Focus", icon: <Focus className="h-3 w-3" /> },
];

function getDefaultParams(actionType: ActionType): any {
  switch (actionType) {
    case "takePhoto":
      return { payloadPositionIndex: 0, fileSuffix: "" };
    case "startRecord":
      return { payloadPositionIndex: 0, fileSuffix: "" };
    case "stopRecord":
      return { payloadPositionIndex: 0 };
    case "gimbalRotate":
      return {
        gimbalPitchRotateAngle: -45,
        gimbalYawRotateAngle: 0,
        gimbalRollRotateAngle: 0,
        gimbalRotateMode: "absoluteAngle",
        payloadPositionIndex: 0,
      };
    case "gimbalEvenlyRotate":
      return {
        gimbalPitchRotateAngle: -45,
        payloadPositionIndex: 0,
      };
    case "rotateYaw":
      return { aircraftHeading: 0, aircraftPathMode: "clockwise" };
    case "hover":
      return { hoverTime: 5 };
    case "zoom":
      return { focalLength: 24 };
    case "focus":
      return { isPointFocus: true, focusX: 0.5, focusY: 0.5, isInfiniteFocus: false };
    default:
      return {};
  }
}

interface ActionEditorProps {
  waypointIndex: number;
}

export function ActionEditor({ waypointIndex }: ActionEditorProps) {
  const { waypoints, addAction, updateAction, removeAction } = useMissionStore();
  const wp = waypoints[waypointIndex];
  if (!wp) return null;

  const handleAddAction = (type: ActionType) => {
    const nextId = wp.actions.length > 0
      ? Math.max(...wp.actions.map((a) => a.actionId)) + 1
      : 0;

    addAction(waypointIndex, {
      actionId: nextId,
      actionType: type,
      params: getDefaultParams(type),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Actions ({wp.actions.length})</Label>
      </div>

      {wp.actions.map((action) => (
        <ActionItem
          key={action.actionId}
          action={action}
          waypointIndex={waypointIndex}
          onUpdate={(updates) => updateAction(waypointIndex, action.actionId, updates)}
          onRemove={() => removeAction(waypointIndex, action.actionId)}
        />
      ))}

      <Select onValueChange={(v) => handleAddAction(v as ActionType)}>
        <SelectTrigger className="h-8 text-xs">
          <div className="flex items-center gap-1">
            <Plus className="h-3 w-3" />
             <span>Add action</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                {opt.icon}
                {opt.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActionItem({
  action,
  waypointIndex,
  onUpdate,
  onRemove,
}: {
  action: WaypointAction;
  waypointIndex: number;
  onUpdate: (updates: Partial<WaypointAction>) => void;
  onRemove: () => void;
}) {
  const opt = ACTION_OPTIONS.find((o) => o.value === action.actionType);
  const params = action.params as Record<string, any>;

  const updateParam = (key: string, value: any) => {
    onUpdate({ params: { ...params, [key]: value } as any });
  };

  return (
    <div className="rounded-md border border-border p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {opt?.icon}
          {opt?.label || action.actionType}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {action.actionType === "hover" && (
        <div>
          <Label className="text-[10px]">Duration (s)</Label>
          <Input
            type="number"
            value={params.hoverTime ?? 5}
            onChange={(e) => updateParam("hoverTime", parseFloat(e.target.value) || 1)}
            min={1}
            max={300}
            className="h-7 text-xs"
          />
        </div>
      )}

      {action.actionType === "gimbalRotate" && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px]">Pitch (&deg;)</Label>
            <Input
              type="number"
              value={params.gimbalPitchRotateAngle ?? 0}
              onChange={(e) => updateParam("gimbalPitchRotateAngle", parseFloat(e.target.value) || 0)}
              min={-120}
              max={45}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Yaw (&deg;)</Label>
            <Input
              type="number"
              value={params.gimbalYawRotateAngle ?? 0}
              onChange={(e) => updateParam("gimbalYawRotateAngle", parseFloat(e.target.value) || 0)}
              min={-180}
              max={180}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}

      {action.actionType === "gimbalEvenlyRotate" && (
        <div>
          <Label className="text-[10px]">Target pitch (&deg;)</Label>
          <Input
            type="number"
            value={params.gimbalPitchRotateAngle ?? -45}
            onChange={(e) => updateParam("gimbalPitchRotateAngle", parseFloat(e.target.value) || 0)}
            min={-120}
            max={45}
            className="h-7 text-xs"
          />
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Smoothly interpolates pitch between waypoints
          </div>
        </div>
      )}

      {action.actionType === "rotateYaw" && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px]">Heading (&deg;)</Label>
            <Input
              type="number"
              value={params.aircraftHeading ?? 0}
              onChange={(e) => updateParam("aircraftHeading", parseFloat(e.target.value) || 0)}
              min={-180}
              max={180}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Direction</Label>
            <Select
              value={params.aircraftPathMode || "clockwise"}
              onValueChange={(v) => updateParam("aircraftPathMode", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clockwise">CW</SelectItem>
                <SelectItem value="counterClockwise">CCW</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {action.actionType === "zoom" && (
        <div>
           <Label className="text-[10px]">Focal length (mm)</Label>
          <Input
            type="number"
            value={params.focalLength ?? 24}
            onChange={(e) => updateParam("focalLength", parseFloat(e.target.value) || 24)}
            min={15}
            max={200}
            className="h-7 text-xs"
          />
        </div>
      )}
    </div>
  );
}
