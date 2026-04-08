import { useState, useEffect } from "react";
import { X, Github, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "droneroute_welcome_dismissed";

interface WelcomeDialogProps {
  open?: boolean;
  onClose?: () => void;
}

export function WelcomeDialog({ open, onClose }: WelcomeDialogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  // Allow external open trigger
  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    onClose?.();
  };

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={dismiss}>
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="DroneRoute" className="h-7 w-7" />
            <h2 className="text-base font-bold">Welcome to DroneRoute</h2>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A free, open-source mission planner for DJI drones. Place waypoints on the map,
            configure flight parameters, and export KMZ files ready to fly.
          </p>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick start</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">W</kbd>
                Add waypoint
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">P</kbd>
                Add POI
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">O</kbd>
                Orbit template
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">G</kbd>
                Grid survey
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">Esc</kbd>
                Cancel / deselect
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">Del</kbd>
                Remove selected
              </span>
            </div>
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

        {/* Footer */}
        <div className="px-5 py-4">
          <Button onClick={dismiss} className="w-full h-9 text-sm">
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}
