import { useEffect } from "react";
import { X, Github, BookOpen, Terminal, Lightbulb } from "lucide-react";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  // Close on Escape key — use capture phase so this fires before global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  const sha = typeof __COMMIT_SHA__ !== "undefined" ? __COMMIT_SHA__ : "dev";
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2.5">
            <img src="/droneroute.png" alt="DroneRoute" className="h-7 w-7" />
            <h2 className="text-base font-bold">DroneRoute</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A free, open-source mission planner for DJI drones. Place waypoints on the map,
            configure flight parameters, and export KMZ files ready to fly.
          </p>

          {/* Version */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Version</span>
            <a
              href={`https://github.com/fcsonline/droneroute/releases/tag/v${version}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border hover:text-foreground transition-colors"
            >
              v{version}
            </a>
            <a
              href={`https://github.com/fcsonline/droneroute/commit/${sha}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border hover:text-foreground transition-colors"
            >
              {sha}
            </a>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href="https://github.com/fcsonline/droneroute"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4 shrink-0" />
              GitHub — Star the repo, report bugs, contribute
            </a>
            <a
              href="https://github.com/fcsonline/droneroute/blob/main/GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              User Guide — Features, shortcuts &amp; tips
            </a>
            <a
              href="https://www.npmjs.com/package/droneroute"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Terminal className="h-4 w-4 shrink-0" />
              Upload to RC — npx droneroute mission.kmz
            </a>
            <a
              href="https://github.com/fcsonline/droneroute/issues?q=is%3Aissue%20state%3Aopen%20label%3Aenhancement"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb className="h-4 w-4 shrink-0" />
              Feature Requests — Vote &amp; suggest ideas
            </a>
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                DroneRoute is free and open-source. If you find it useful, consider supporting its development:
              </p>
              <a
                href="https://www.buymeacoffee.com/fcsonline"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
                  alt="Buy Me a Coffee"
                  className="h-8"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Footer spacer */}
        <div className="px-5 py-3" />
      </div>
    </div>
  );
}
