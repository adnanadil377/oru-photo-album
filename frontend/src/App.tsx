import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { EventPage } from "@/pages/EventPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Home } from "@/pages/Home";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link, navigate } from "@/components/Link";

type Route =
  | { name: "home" }
  | { name: "login" }
  | { name: "register" }
  | { name: "dashboard" }
  | { name: "create" }
  | { name: "event"; slug: string }
  | { name: "gallery"; slug: string }
  | { name: "not-found" };

function parseRoute(pathname: string): Route {
  const galleryMatch = pathname.match(/^\/e\/([^/]+)\/gallery\/?$/);
  if (galleryMatch) {
    return { name: "gallery", slug: decodeURIComponent(galleryMatch[1]) };
  }

  const eventMatch = pathname.match(/^\/e\/([^/]+)\/?$/);
  if (eventMatch) {
    return { name: "event", slug: decodeURIComponent(eventMatch[1]) };
  }

  if (pathname === "/login") {
    return { name: "login" };
  }

  if (pathname === "/register") {
    return { name: "register" };
  }

  if (pathname === "/dashboard") {
    return { name: "dashboard" };
  }

  if (pathname === "/create") {
    return { name: "create" };
  }

  if (pathname === "/" || pathname === "") {
    return { name: "home" };
  }

  return { name: "not-found" };
}

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <p className="font-serif text-5xl font-semibold text-foreground">This page is not part of the album.</p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const route = parseRoute(pathname);

  return (
    <ErrorBoundary>
      {route.name === "home" ? <HomeRedirect /> : null}
      {route.name === "login" ? <Login /> : null}
      {route.name === "register" ? <Register /> : null}
      {route.name === "dashboard" ? (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ) : null}
      {route.name === "create" ? (
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      ) : null}
      {route.name === "event" ? <EventPage slug={route.slug} /> : null}
      {route.name === "gallery" ? (
        <ProtectedRoute>
          <GalleryPage slug={route.slug} />
        </ProtectedRoute>
      ) : null}
      {route.name === "not-found" ? <NotFound /> : null}
    </ErrorBoundary>
  );
}
