import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { SnackbarProvider } from "notistack";
import { useThemeStore } from "./stores/theme";
import { AuthProvider, useAuth as useOidcAuth } from "react-oidc-context";
import { useEffect } from "react";
import useAuthStore from "./stores/auth";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

const oidcConfig = {
  authority: import.meta.env.VITE_KEYCLOAK_URL ? `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}` : "",
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname);
  }
};

function AuthSynchronizer() {
    const { user, isAuthenticated } = useOidcAuth();
    const store = useAuthStore();
    
    useEffect(() => {
        if (isAuthenticated && user?.access_token) {
            localStorage.setItem('auth_access_token', user.access_token);
            if (user.refresh_token) {
                 localStorage.setItem('auth_refresh_token', user.refresh_token);
            }
            
            // Mark auth source as Keycloak
            sessionStorage.setItem('auth_source', 'keycloak');
        } else if (!isAuthenticated && !user && store.isAuthenticated && localStorage.getItem('auth_access_token')) {
            // Keycloak logout detected or sync mismatch
            // Only force logout if the previous session was from Keycloak
            if (sessionStorage.getItem('auth_source') === 'keycloak') {
                store.signOut();
                sessionStorage.removeItem('auth_source');
            }
        }
    }, [isAuthenticated, user, store.isAuthenticated, store.initialize, store.signOut]);  
    return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeStore();
  const isKeycloakEnabled = !!oidcConfig.authority && !!oidcConfig.client_id;

  const content = (
    <html lang="en" className="h-full" data-theme={mode}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          {children}
          {isKeycloakEnabled && <AuthSynchronizer />}
          <ScrollRestoration />
          <Scripts />
        </SnackbarProvider>
      </body>
    </html>
  );

  if (isKeycloakEnabled) {
      return <AuthProvider {...oidcConfig}>{content}</AuthProvider>;
  }

  return content;
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
