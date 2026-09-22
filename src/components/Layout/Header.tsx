import { useLocation } from 'react-router-dom'
import { getLoggedUser } from '../../lib/auth'
import { NotificationsPopover } from '../NotificationsPopover'
import { Sparkles, Rocket, Users, Database, LayoutDashboard, ShoppingBag, Cloud } from 'lucide-react'
import clsx from 'clsx'

export function Header() {
  const location = useLocation()
  const user = getLoggedUser()

  const getPageInfo = () => {
    const path = location.pathname
    if (path === '/') {
      return { title: 'Dashboard Geral', icon: LayoutDashboard, subtitle: 'Métricas, bases e status em tempo real' }
    }
    if (path.startsWith('/clientes')) {
      return { title: 'Clientes Mantran', icon: Users, subtitle: 'Gerenciamento de contratos, módulos e bases' }
    }
    if (path.startsWith('/implantacoes')) {
      return { title: 'Implantações & Onboarding', icon: Rocket, subtitle: 'Acompanhamento do fluxo e checkpoints de clientes' }
    }
    if (path.startsWith('/bases')) {
      return { title: 'Projetos e Bases', icon: Database, subtitle: 'Estruturas, tabelas e migrações de dados' }
    }
    if (path.startsWith('/processamento-shopee')) {
      return { title: 'Processamento Shopee', icon: ShoppingBag, subtitle: 'Operações e integrações de rotas' }
    }
    if (path.startsWith('/leo-madeiras')) {
      return { title: 'Léo Madeiras', icon: Cloud, subtitle: 'Ambiente dedicado e parametrizações' }
    }
    return { title: 'Sistema Mantran', icon: Sparkles, subtitle: 'Portal de Gestão de Clientes e Implantação' }
  }

  const pageInfo = getPageInfo()
  const PageIcon = pageInfo.icon

  const isCliente = user?.perfil?.toLowerCase() === 'cliente'
  const isParceiro = user?.perfil?.toLowerCase() === 'parceiro'
  const isUsuario = user?.perfil?.toLowerCase() === 'usuario'
  const isComercial = user?.perfil?.toLowerCase() === 'comercial'

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0f111a]/80 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0 select-none">
      
      {/* Page Title & Context */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
          <PageIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            {pageInfo.title}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right side controls: Notifications Bell + User Profile */}
      <div className="flex items-center gap-3.5">
        
        {/* Sininho de Notificações */}
        <NotificationsPopover />

        {/* User Capsule */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className={clsx(
            "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs uppercase shrink-0 border shadow-sm",
            isParceiro
              ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
              : isComercial
              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
              : isUsuario
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : isCliente
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-brand-500/20 border-brand-500/30 text-brand-400"
          )}>
            {(user?.nome || user?.login || 'U').charAt(0)}
          </div>
          
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
              {user?.nome || user?.login || 'Usuário'}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              {isCliente ? 'Acesso Cliente' : isParceiro ? 'Parceiro' : isComercial ? 'Comercial' : isUsuario ? 'Consulta' : (user?.perfil || 'Suporte')}
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
