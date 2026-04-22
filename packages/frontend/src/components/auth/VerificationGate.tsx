import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/store/authStore";
import { Shield } from "lucide-react";

export function VerificationGate() {
  const { googleLogin, email, logout } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    try {
      await googleLogin(credentialResponse.credential);
    } catch (err: any) {
      if (err.message?.includes("email")) {
        setError(`Please sign in with the Google account matching ${email}`);
      } else {
        setError(err.message || "Google sign-in failed");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Verify your account</h2>
          <p className="text-sm text-muted-foreground">
            To continue using DroneRoute, please verify your email by signing in
            with Google.
          </p>
          {email && (
            <p className="text-xs text-muted-foreground">
              Use the Google account matching{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in failed")}
            theme="filled_black"
            size="large"
            width="320"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={logout}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
