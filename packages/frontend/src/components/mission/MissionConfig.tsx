import { useMissionStore } from "@/store/missionStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRONE_MODELS } from "@droneroute/shared";
import type { HeadingMode, TurnMode, FinishAction, RCLostAction, HeightMode, FlyToWaylineMode } from "@droneroute/shared";

export function MissionConfig() {
  const { config, setConfig } = useMissionStore();

  const selectedDrone = DRONE_MODELS.find(
    (d) => d.droneEnumValue === config.droneEnumValue && d.droneSubEnumValue === config.droneSubEnumValue
  );

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mission Settings</h3>

      <div>
        <Label className="text-xs">Drone Model</Label>
        <Select
          value={`${config.droneEnumValue}-${config.droneSubEnumValue}`}
          onValueChange={(v) => {
            const [drone, sub] = v.split("-").map(Number);
            const model = DRONE_MODELS.find((d) => d.droneEnumValue === drone && d.droneSubEnumValue === sub);
            if (model) {
              setConfig({
                droneEnumValue: model.droneEnumValue,
                droneSubEnumValue: model.droneSubEnumValue,
                payloadEnumValue: model.payloads[0]?.payloadEnumValue || 0,
              });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DRONE_MODELS.map((d) => (
              <SelectItem key={`${d.droneEnumValue}-${d.droneSubEnumValue}`} value={`${d.droneEnumValue}-${d.droneSubEnumValue}`}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDrone && selectedDrone.payloads.length > 1 && (
        <div>
          <Label className="text-xs">Payload</Label>
          <Select
            value={String(config.payloadEnumValue)}
            onValueChange={(v) => setConfig({ payloadEnumValue: parseInt(v) })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedDrone.payloads.map((p) => (
                <SelectItem key={p.payloadEnumValue} value={String(p.payloadEnumValue)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Flight Speed (m/s)</Label>
          <Input
            type="number"
            value={config.autoFlightSpeed}
            onChange={(e) => setConfig({ autoFlightSpeed: parseFloat(e.target.value) || 1 })}
            min={1}
            max={15}
            step={0.5}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Takeoff Height (m)</Label>
          <Input
            type="number"
            value={config.takeOffSecurityHeight}
            onChange={(e) => setConfig({ takeOffSecurityHeight: parseFloat(e.target.value) || 1.2 })}
            min={1.2}
            max={1500}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Height Reference</Label>
        <Select
          value={config.heightMode}
          onValueChange={(v) => setConfig({ heightMode: v as HeightMode })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relativeToStartPoint">Relative to Start</SelectItem>
            <SelectItem value="EGM96">EGM96 (MSL)</SelectItem>
            <SelectItem value="aboveGroundLevel">Above Ground Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Heading Mode</Label>
        <Select
          value={config.globalHeadingMode}
          onValueChange={(v) => setConfig({ globalHeadingMode: v as HeadingMode })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="followWayline">Follow Wayline</SelectItem>
            <SelectItem value="manually">Manual</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="smoothTransition">Smooth Transition</SelectItem>
            <SelectItem value="towardPOI">Toward POI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Fly-to Mode</Label>
        <Select
          value={config.flyToWaylineMode}
          onValueChange={(v) => setConfig({ flyToWaylineMode: v as FlyToWaylineMode })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="safely">Safely (climb then fly)</SelectItem>
            <SelectItem value="pointToPoint">Point to Point (direct)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Finish Action</Label>
        <Select
          value={config.finishAction}
          onValueChange={(v) => setConfig({ finishAction: v as FinishAction })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="goHome">Go Home</SelectItem>
            <SelectItem value="autoLand">Auto Land</SelectItem>
            <SelectItem value="gotoFirstWaypoint">Go to First WP</SelectItem>
            <SelectItem value="noAction">No Action (hover)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">RC Lost Action</Label>
        <Select
          value={config.executeRCLostAction}
          onValueChange={(v) => setConfig({ executeRCLostAction: v as RCLostAction })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="goBack">Go Back (RTH)</SelectItem>
            <SelectItem value="landing">Land</SelectItem>
            <SelectItem value="hover">Hover</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Transit Speed (m/s)</Label>
        <Input
          type="number"
          value={config.globalTransitionalSpeed}
          onChange={(e) => setConfig({ globalTransitionalSpeed: parseFloat(e.target.value) || 1 })}
          min={1}
          max={15}
          step={0.5}
          className="h-8 text-xs"
        />
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Speed to fly to first waypoint
        </div>
      </div>
    </div>
  );
}
