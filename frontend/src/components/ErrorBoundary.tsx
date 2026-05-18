import React from "react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Page failed to render", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-ivory px-6 text-center">
          <div className="max-w-md">
            <p className="font-serif text-4xl font-semibold text-charcoal">Something went quiet.</p>
            <p className="mt-4 text-muted">Refresh the page and try again.</p>
            <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
