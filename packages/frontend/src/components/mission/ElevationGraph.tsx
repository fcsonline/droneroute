import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMissionStore } from "@/store/missionStore";
import type { SelectionMode } from "@/store/missionStore";

const GRAPH_HEIGHT = 100;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;
const PAD_LEFT = 28;
const PAD_RIGHT = 28;
const CIRCLE_RADIUS = 11;
const CIRCLE_RADIUS_ACTIVE = 13;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 500;
const MIN_SPACING = 44;

const LS_KEY = "elevationChartOpen";

export function ElevationGraph() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const selectedIndices = useMissionStore((s) => s.selectedWaypointIndices);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);
  const selectWaypoint = useMissionStore((s) => s.selectWaypoint);

  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const pointerStart = useRef<{
    x: number;
    y: number;
    index: number;
    event: React.PointerEvent;
  } | null>(null);
  const didDrag = useRef(false);
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(LS_KEY) !== "false",
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  }, []);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SVG width: ensure minimum spacing between waypoints
  const effectiveWidth = containerWidth || 320;
  const neededWidth =
    waypoints.length <= 1
      ? effectiveWidth
      : PAD_LEFT + PAD_RIGHT + (waypoints.length - 1) * MIN_SPACING;
  const svgWidth = Math.max(effectiveWidth, neededWidth);

  const plotW = svgWidth - PAD_LEFT - PAD_RIGHT;
  const plotH = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Compute Y scale
  const heights = waypoints.map((wp) => wp.height);
  const rawMin = Math.min(...heights);
  const rawMax = Math.max(...heights);
  const spread = rawMax - rawMin;
  const yPad = Math.max(spread * 0.25, 10);
  const yMin = Math.max(0, Math.floor(rawMin - yPad));
  const yMax = Math.ceil(rawMax + yPad);

  const toX = useCallback(
    (i: number) => {
      if (waypoints.length === 1) return PAD_LEFT + plotW / 2;
      return PAD_LEFT + (i / (waypoints.length - 1)) * plotW;
    },
    [waypoints.length, plotW],
  );

  const toY = useCallback(
    (h: number) => {
      if (yMax === yMin) return PAD_TOP + plotH / 2;
      return PAD_TOP + plotH - ((h - yMin) / (yMax - yMin)) * plotH;
    },
    [yMin, yMax, plotH],
  );

  const fromY = useCallback(
    (py: number) => {
      if (yMax === yMin) return rawMin;
      const h = yMin + ((PAD_TOP + plotH - py) / plotH) * (yMax - yMin);
      return Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h)));
    },
    [yMin, yMax, plotH, rawMin],
  );

  // Drag handlers (with click-to-select detection)
  const CLICK_THRESHOLD = 3; // px — below this, treat as click

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, wpIndex: number) => {
      e.preventDefault();
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      pointerStart.current = {
        x: e.clientX,
        y: e.clientY,
        index: wpIndex,
        event: e,
      };
      didDrag.current = false;
      setDraggingIndex(wpIndex);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;
      const svg = svgRef.current;
      if (!svg) return;

      // Check if pointer moved enough to be a drag
      if (pointerStart.current && !didDrag.current) {
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) return;
        didDrag.current = true;
      }

      const rect = svg.getBoundingClientRect();
      const py = e.clientY - rect.top;
      const newHeight = fromY(py);
      updateWaypoint(draggingIndex, { height: newHeight });
    },
    [draggingIndex, fromY, updateWaypoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex !== null && pointerStart.current && !didDrag.current) {
        // This was a click, not a drag — select the waypoint
        const nativeEvent = e.nativeEvent;
        let mode: SelectionMode = "replace";
        if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
          mode = "toggle";
        } else if (nativeEvent.shiftKey) {
          mode = "range";
        }
        selectWaypoint(pointerStart.current.index, mode);
      }
      setDraggingIndex(null);
      pointerStart.current = null;
      didDrag.current = false;
    },
    [draggingIndex, selectWaypoint],
  );

  const handlePointerLeave = useCallback(() => {
    setDraggingIndex(null);
    pointerStart.current = null;
    didDrag.current = false;
  }, []);

  if (waypoints.length === 0) return null;

  // Compute edge-to-edge line segments between circles
  const edgeSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = toX(i);
    const ay = toY(waypoints[i].height);
    const bx = toX(i + 1);
    const by = toY(waypoints[i + 1].height);
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CIRCLE_RADIUS * 2 + 4) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    const rA =
      draggingIndex === waypoints[i].index
        ? CIRCLE_RADIUS_ACTIVE
        : CIRCLE_RADIUS;
    const rB =
      draggingIndex === waypoints[i + 1].index
        ? CIRCLE_RADIUS_ACTIVE
        : CIRCLE_RADIUS;
    edgeSegments.push({
      x1: ax + nx * (rA + 2),
      y1: ay + ny * (rA + 2),
      x2: bx - nx * (rB + 2),
      y2: by - ny * (rB + 2),
    });
  }

  return (
    <div ref={containerRef} className="border-t border-border bg-background/50">
      {/* Pinned header — always visible */}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
        onClick={toggleExpanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Elevation chart
      </button>

      {/* Hint */}
      {expanded && waypoints.length >= 2 && draggingIndex === null && (
        <p className="px-3 pb-1 text-[10px] text-muted-foreground">
          Drag waypoints up or down to adjust altitude
        </p>
      )}

      {/* Collapsible body */}
      {expanded && (
        <div
          className="overflow-x-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#334155 transparent",
          }}
        >
          <svg
            ref={svgRef}
            width={svgWidth}
            height={GRAPH_HEIGHT}
            className="select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            {/* Full-pane background grid */}
            {(() => {
              const lines = [];
              // Horizontal grid lines
              const hCount = 5;
              for (let i = 0; i <= hCount; i++) {
                const y = (i / hCount) * GRAPH_HEIGHT;
                lines.push(
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={y}
                    x2={svgWidth}
                    y2={y}
                    stroke="#475569"
                    strokeWidth={0.5}
                    opacity={0.3}
                  />,
                );
              }
              // Vertical grid lines (every ~40px)
              const vStep = 40;
              for (let x = 0; x <= svgWidth; x += vStep) {
                lines.push(
                  <line
                    key={`v-${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={GRAPH_HEIGHT}
                    stroke="#475569"
                    strokeWidth={0.5}
                    opacity={0.3}
                  />,
                );
              }
              return lines;
            })()}

            {/* Edge-to-edge dotted line segments between circles */}
            {edgeSegments.map((seg, i) => (
              <line
                key={`seg-${i}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="4,4"
                opacity={0.7}
              />
            ))}

            {/* Nodes */}
            {waypoints.map((wp, i) => {
              const cx = toX(i);
              const cy = toY(wp.height);
              const isSelected = selectedIndices.has(wp.index);
              const isDragging = draggingIndex === wp.index;
              const r = isDragging ? CIRCLE_RADIUS_ACTIVE : CIRCLE_RADIUS;

              return (
                <g key={wp.index}>
                  {/* Invisible larger hit area */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 6}
                    fill="transparent"
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                    onPointerDown={(e) => handlePointerDown(e, wp.index)}
                  />

                  {/* Circle background */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={
                      isDragging
                        ? "#2563eb"
                        : isSelected
                          ? "#3b82f6"
                          : "#1e3a5f"
                    }
                    stroke={
                      isDragging
                        ? "#93c5fd"
                        : isSelected
                          ? "#60a5fa"
                          : "#3b82f6"
                    }
                    strokeWidth={isDragging ? 2 : 1.5}
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                    onPointerDown={(e) => handlePointerDown(e, wp.index)}
                  />

                  {/* Waypoint number inside circle */}
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isDragging || isSelected ? "#fff" : "#93c5fd"}
                    fontSize={r > 11 ? 10 : 9}
                    fontWeight={600}
                    style={{
                      pointerEvents: "none",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}
                  </text>

                  {/* Height label above circle */}
                  <text
                    x={cx}
                    y={cy - r - 4}
                    textAnchor="middle"
                    fill={
                      isDragging
                        ? "#93c5fd"
                        : isSelected
                          ? "#60a5fa"
                          : "#94a3b8"
                    }
                    fontSize={9}
                    fontWeight={isDragging ? 700 : 500}
                    style={{
                      pointerEvents: "none",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {wp.height}m
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
