import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { useConfigStore } from "@/store/configStore";
import { useAuthStore } from "@/store/authStore";
import { VerificationGate } from "@/components/auth/VerificationGate";

export function AppWrapper() {
  const { selfHosted, googleClientId, loaded, fetchConfig } = useConfigStore();
  const { needsVerification, token } = useAuthStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!loaded) {
    return null;
  }

  const showVerificationGate = !selfHosted && token && needsVerification;

  // In cloud mode, wrap with GoogleOAuthProvider
  if (!selfHosted && googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
        {showVerificationGate && <VerificationGate />}
      </GoogleOAuthProvider>
    );
  }

  return (
    <>
      <App />
      {showVerificationGate && <VerificationGate />}
    </>
  );
}
