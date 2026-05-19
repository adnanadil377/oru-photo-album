import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { EventPage } from "@/pages/EventPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { Home } from "@/pages/Home";
import { useEffect, useState } from "react";

type Route =
  | { name: "home" }
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
          <a href="/">Create an event</a>
        </Button>
      </div>
    </main>
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
      {route.name === "home" ? <Home /> : null}
      {route.name === "event" ? <EventPage slug={route.slug} /> : null}
      {route.name === "gallery" ? <GalleryPage slug={route.slug} /> : null}
      {route.name === "not-found" ? <NotFound /> : null}
    </ErrorBoundary>
  );
}
