import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useConfigStore } from "@/store/configStore";
import { X } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register, googleLogin, isLoading } = useAuthStore();
  const { selfHosted } = useConfigStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    try {
      await googleLogin(credentialResponse.credential);
      onClose();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">
            {selfHosted
              ? mode === "login"
                ? "Sign in"
                : "Create account"
              : "Sign in with Google"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {selfHosted ? (
            <>
              {/* Self-hosted: email + password form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-9 text-sm"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "Min 6 characters" : ""}
                    className="h-9 text-sm"
                    required
                    minLength={mode === "register" ? 6 : undefined}
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-9 text-sm"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "..."
                    : mode === "login"
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>

              {/* Toggle mode */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                >
                  {mode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Cloud: Google OAuth only */}
              <p className="text-xs text-muted-foreground text-center">
                Sign in or create an account using your Google account.
              </p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed")}
                  theme="filled_black"
                  size="large"
                  width="320"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
