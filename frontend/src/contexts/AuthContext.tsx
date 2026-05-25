import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, refreshAccessToken } from "@/lib/api";
import { setAccessToken, clearAccessToken } from "@/lib/auth";

interface HostResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

interface AuthContextType {
  host: HostResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HostResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const { access_token } = await refreshAccessToken();
        setAccessToken(access_token);
        const me = await getMe();
        setHost(me);
      } catch (err) {
        setHost(null);
        clearAccessToken();
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (payload: any) => {
    const data = await apiLogin(payload);
    setAccessToken(data.access_token);
    setHost(data.host);
  };

  const register = async (payload: any) => {
    const data = await apiRegister(payload);
    setAccessToken(data.access_token);
    setHost(data.host);
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    clearAccessToken();
    setHost(null);
  };

  return (
    <AuthContext.Provider value={{ host, isLoading, isAuthenticated: !!host, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
