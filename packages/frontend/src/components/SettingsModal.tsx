import { useEffect } from "react";
import { X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { LayersSettings } from "@/components/settings/LayersSettings";

interface SettingsModalProps {
  onClose: () => void;
  onRequestAuth: () => void;
}

export function SettingsModal({ onClose, onRequestAuth }: SettingsModalProps) {
  // Close on Escape — capture phase so it fires before global shortcuts
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>
            <div className="relative mt-3">
              <TabsContent value="account" forceMount className="mt-0 data-[state=inactive]:invisible">
                <AccountSettings onRequestAuth={onRequestAuth} />
              </TabsContent>
              <TabsContent value="layers" forceMount className="mt-0 absolute inset-x-0 top-0 data-[state=inactive]:invisible">
                <LayersSettings />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
