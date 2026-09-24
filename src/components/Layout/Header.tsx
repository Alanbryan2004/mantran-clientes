import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getLoggedUser } from '../../lib/auth'
import { NotificationsPopover } from '../NotificationsPopover'
import { AlterarMinhaSenhaModal } from '../AlterarMinhaSenhaModal'
import { 
  Sparkles, 
  Rocket, 
  Users, 
  Database, 
  LayoutDashboard, 
  ShoppingBag, 
  Cloud, 
  Palmtree, 
  KeyRound, 
  LogOut, 
  ChevronDown,
  UserCheck
} from 'lucide-react'
import clsx from 'clsx'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getLoggedUser()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAlterarSenhaModalOpen, setIsAlterarSenhaModalOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const getPageInfo = () => {
    const path = location.pathname
    if (path === '/') {
      return { title: 'Dashboard Geral', icon: LayoutDashboard, subtitle: 'Métricas, bases e status em tempo real' }
    }
    if (path.startsWith('/rh')) {
      return { title: 'Recursos Humanos & Férias', icon: Palmtree, subtitle: 'Planejamento de férias em 2 quinzenas e atestados médicos' }
    }
    if (path.startsWith('/comercial')) {
      return { title: 'Comercial & Vendas', icon: Rocket, subtitle: 'Pipeline de oportunidades, propostas e metas' }
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
    if (path.startsWith('/usuarios')) {
      return { title: 'Usuários do Sistema', icon: UserCheck, subtitle: 'Gerenciamento de acessos e colaboradores' }
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

      {/* Right side controls: Notifications Bell + User Profile Dropdown */}
      <div className="flex items-center gap-3.5">
        
        {/* Sininho de Notificações */}
        <NotificationsPopover />

        {/* User Capsule & Menu */}
        <div className="relative pl-3 border-l border-slate-800" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={clsx(
              "flex items-center gap-2.5 p-1.5 rounded-xl border transition-all duration-150 cursor-pointer group focus:outline-none",
              isUserMenuOpen 
                ? "bg-slate-800 border-slate-700 shadow-md" 
                : "bg-transparent border-transparent hover:bg-slate-800/60 hover:border-slate-800"
            )}
            title="Menu do Usuário"
          >
            <div className={clsx(
              "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs uppercase shrink-0 border shadow-sm transition-transform group-hover:scale-105",
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
            
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {user?.nome || user?.login || 'Usuário'}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {isCliente ? 'Acesso Cliente' : isParceiro ? 'Parceiro' : isComercial ? 'Comercial' : isUsuario ? 'Consulta' : (user?.perfil || 'Suporte')}
              </span>
            </div>

            <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isUserMenuOpen && "rotate-180 text-brand-400")} />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col p-1.5 space-y-1">
              
              {/* Header Info no Dropdown */}
              <div className="p-2.5 border-b border-slate-800/80 mb-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.nome || user?.login}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {user?.login} • <span className="text-brand-400">{user?.perfil || 'Usuário'}</span>
                </p>
              </div>

              {/* Opção 1: Alterar Senha */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsAlterarSenhaModalOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-brand-400" />
                <span>Alterar Senha</span>
              </button>

              {/* Opção 2: RH & Férias */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  navigate('/rh')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-brand-500/10 hover:text-brand-300 transition-colors text-left cursor-pointer"
              >
                <Palmtree className="w-4 h-4 text-teal-400" />
                <span>RH & Férias</span>
              </button>

              {/* Opção 3: Sair */}
              <div className="pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('@Mantran:user')
                    window.location.href = '/'
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal de Alteração de Senha */}
      <AlterarMinhaSenhaModal
        isOpen={isAlterarSenhaModalOpen}
        onClose={() => setIsAlterarSenhaModalOpen(false)}
      />
    </header>
  )
}

