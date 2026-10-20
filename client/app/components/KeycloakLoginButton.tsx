import React from "react";
import { useAuth } from "react-oidc-context";
import { ShieldCheck } from "lucide-react";

interface KeycloakLoginButtonProps {
  disabled?: boolean;
}

export const KeycloakLoginButton: React.FC<KeycloakLoginButtonProps> = ({ disabled }) => {
  const auth = useAuth();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void auth.signinRedirect()}
      className="kai-auth-secondary"
    >
      <ShieldCheck size={18} aria-hidden="true" />
      Continue with Keycloak
    </button>
  );
};

