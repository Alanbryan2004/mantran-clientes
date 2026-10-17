import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, PlusCircle, Cpu } from "lucide-react";

export default function CronogramaTabs() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === "Administrador";
  const isTecnico = (user?.perfil || "").toLowerCase().includes("tecnico");

  const tabs = [
    { name: "Visualizar", path: "/dev/cronograma/visualizar", icon: Calendar },
    ...(isAdmin ? [{ name: "Incluir", path: "/dev/cronograma/incluir", icon: PlusCircle }] : []),
    ...(isAdmin || isTecnico ? [{ name: "Arquitetura", path: "/dev/cronograma/arquitetura", icon: Cpu }] : []),
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm mb-5 w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            <Icon size={14} />
            {tab.name}
          </NavLink>
        );
      })}
    </div>
  );
}
