import { createContext, useContext, useMemo } from "react";
import { getLoggedUser } from "../../../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const logged = getLoggedUser();

  const user = useMemo(() => {
    if (!logged) return null;
    return {
      id: logged.id,
      nome: logged.nome || logged.login,
      login: logged.login,
      perfil: logged.perfil,
      e_tecnico: (logged.perfil || "").toLowerCase().includes("tecnico"),
      ativo: logged.ativo !== false,
      meta_semanal: logged.meta_semanal || 44
    };
  }, [logged?.id, logged?.nome, logged?.perfil]);

  const logout = () => {
    localStorage.removeItem("@Mantran:user");
    window.location.href = "/";
  };

  const value = useMemo(() => ({ user, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;

  // Fallback direto se o componente for montado fora do AuthProvider de Dev
  const logged = getLoggedUser();
  const user = logged ? {
    id: logged.id,
    nome: logged.nome || logged.login,
    login: logged.login,
    perfil: logged.perfil,
    e_tecnico: (logged.perfil || "").toLowerCase().includes("tecnico"),
    ativo: logged.ativo !== false,
    meta_semanal: logged.meta_semanal || 44
  } : null;

  return {
    user,
    logout: () => {
      localStorage.removeItem("@Mantran:user");
      window.location.href = "/";
    }
  };
}
