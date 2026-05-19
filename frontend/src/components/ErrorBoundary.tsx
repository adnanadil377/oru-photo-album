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
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-md">
            <p className="font-serif text-4xl font-semibold text-foreground">Something went quiet.</p>
            <p className="mt-4 text-muted">We encountered an unexpected error displaying this page.</p>
            <Button onClick={() => window.location.reload()} className="mt-8">
              Refresh the page
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
