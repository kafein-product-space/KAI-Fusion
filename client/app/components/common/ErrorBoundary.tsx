import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--kai-bg-deep)] p-8 text-zinc-100">
          <div className="max-w-md w-full">
        <div className="rounded-xl border border-[var(--kai-surface-selected)] bg-[var(--kai-error-surface)] p-8 text-center shadow-2xl shadow-black/30">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>

              <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
                Oops! Something went wrong
              </h1>

              <p className="mb-6 text-sm leading-6 text-zinc-400">
                We encountered an unexpected error. This has been logged and
                we'll look into it.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-4 text-left">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-300">
                    Error Details:
                  </h3>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-red-200/80">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack && (
                      <div className="mt-2">
                        Component Stack:
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--kai-accent)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--kai-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/40"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--kai-error-action-border)] bg-[var(--kai-node-config-bg)] px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-[var(--kai-panel-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/30"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier usage
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  fallback,
  onError,
}) => {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
};

export default ErrorBoundary;
