import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const { host, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b">
      <a href="/dashboard" className="font-serif text-2xl font-semibold text-foreground">
        Memoire
      </a>
      {host && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">{host.display_name}</span>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      )}
    </header>
  );
}
