import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { getLoggedUser, isFuncionarioUser } from '../../lib/auth'
import { permissionsApi } from '../../lib/permissions'
import { NotificationsPopover } from '../NotificationsPopover'
import { AlterarMinhaSenhaModal } from '../AlterarMinhaSenhaModal'
import { ControlePontoModal } from '../ControlePontoModal'
import { PersonalizarAtalhosModal } from '../PersonalizarAtalhosModal'
import { 
  loadUserShortcutIds, 
  ALL_SHORTCUT_OPTIONS, 
  type ShortcutDefinition, 
  isShortcutPermitted 
} from '../../lib/headerShortcuts'
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
  UserCheck, 
  Clock, 
  CalendarDays,
  Plus,
  SlidersHorizontal,
  LogIn,
  BookOpen,
  MapPin,
  FileSpreadsheet,
  FileStack
} from 'lucide-react'
import clsx from 'clsx'

interface HeaderProps {
  onOpenLogin?: () => void
}

export function Header({ onOpenLogin }: HeaderProps = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getLoggedUser()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAlterarSenhaModalOpen, setIsAlterarSenhaModalOpen] = useState(false)
  const [isPontoModalOpen, setIsPontoModalOpen] = useState(false)
  const [isAtalhosModalOpen, setIsAtalhosModalOpen] = useState(false)
  const [shortcutIds, setShortcutIds] = useState<string[]>(() => loadUserShortcutIds(user))
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Atualiza atalhos quando o usuário logado muda ou evento é disparado
  useEffect(() => {
    const handleUpdate = () => {
      setShortcutIds(loadUserShortcutIds(user))
    }
    handleUpdate()
    window.addEventListener('mantran:shortcuts-updated', handleUpdate)
    window.addEventListener('mantran:permissions-updated', handleUpdate)
    return () => {
      window.removeEventListener('mantran:shortcuts-updated', handleUpdate)
      window.removeEventListener('mantran:permissions-updated', handleUpdate)
    }
  }, [user?.id])

  // Resolve as definições completas dos atalhos configurados e permitidos
  const activeShortcuts = useMemo(() => {
    return shortcutIds
      .map(id => ALL_SHORTCUT_OPTIONS.find(opt => opt.id === id))
      .filter((opt): opt is ShortcutDefinition => !!opt && isShortcutPermitted(opt, user))
      .slice(0, 4)
  }, [shortcutIds, user])

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

  // Abrir o modal de Controle de Ponto quando disparado por outro componente
  // (ex: ao clicar em "Visualizar Ponto" numa notificação de lembrete)
  useEffect(() => {
    const abrirPonto = () => setIsPontoModalOpen(true)
    window.addEventListener('mantran:abrir-controle-ponto', abrirPonto)
    return () => window.removeEventListener('mantran:abrir-controle-ponto', abrirPonto)
  }, [])

  const getPageInfo = () => {
    const path = location.pathname
    if (path.startsWith('/juntar')) {
      return { title: 'Juntar Planilhas Shopee 4PL', icon: FileStack, subtitle: 'Unificação e conferência de planilhas por operação' }
    }
    if (path.startsWith('/separador')) {
      return { title: 'Separador de Planilhas', icon: FileSpreadsheet, subtitle: 'Validação e divisão de pré-faturas Shopee por operação' }
    }
    if (path.startsWith('/cidades')) {
      return { title: 'Cidades & Faixas de CEP', icon: MapPin, subtitle: 'Consulta de municípios, faixas de CEP e códigos IBGE' }
    }
    if (path.startsWith('/faq') || (!user && path === '/')) {
      return { title: 'FAQ — Como fazer no Mantran', icon: BookOpen, subtitle: 'Procedimentos passo a passo e documentação' }
    }
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
    <header className="h-16 border-b border-slate-800/80 bg-[#0f111a]/80 backdrop-blur-md px-6 flex items-center justify-between relative z-40 shrink-0 select-none">
      
      {/* Page Context Icon + Atalhos Rápidos (Até 4) OU Logo Mantran para visitantes */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {!user ? (
          <div className="flex items-center gap-3">
            <img 
              src="/Logo_Mantran_Branco.png" 
              onError={(e) => { e.currentTarget.src = '/Logo_Mantran.png' }}
              alt="Mantran Tecnologias" 
              className="h-7 sm:h-8 w-auto object-contain select-none shrink-0"
            />
            <div className="h-5 w-[1px] bg-slate-800 shrink-0 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-white tracking-wide">
                {location.pathname.startsWith('/juntar')
                  ? 'Juntar Planilhas Shopee 4PL'
                  : location.pathname.startsWith('/separador') 
                    ? 'Separador de Planilhas Shopee' 
                    : (location.pathname.startsWith('/cidades') ? 'Cidades & Faixas de CEP' : 'FAQ & Procedimentos Mantran')}
              </span>
              <span className="text-[10px] text-slate-400">
                {location.pathname.startsWith('/juntar')
                  ? 'Unificação de pré-faturas e garantia de integridade'
                  : location.pathname.startsWith('/separador') 
                    ? 'Validação de 53 colunas e divisão por operação' 
                    : (location.pathname.startsWith('/cidades') ? 'Consulta pública de CEP e IBGE' : 'Base de conhecimento e autoatendimento')}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div 
              className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 shadow-sm"
              title={`Tela Atual: ${pageInfo.title}`}
            >
              <PageIcon className="w-5 h-5" />
            </div>

            {/* Separador vertical sutil */}
            <div className="h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5 sm:mx-1" />

            {/* Atalhos Rápidos do Topo */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {activeShortcuts.map((shortcut) => {
                const Icon = shortcut.icon
                const isActive = location.pathname === shortcut.path || 
                  (shortcut.path !== '/' && location.pathname.startsWith(shortcut.path))
                return (
                  <NavLink
                    key={shortcut.id}
                    id={`shortcut-header-${shortcut.id}`}
                    to={shortcut.path}
                    title={`Atalho: ${shortcut.name}`}
                    className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative group cursor-pointer shrink-0",
                      isActive
                        ? "bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm shadow-brand-500/10"
                        : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700"
                    )}
                  >
                    <Icon className={clsx("w-4 h-4 transition-transform group-hover:scale-110", shortcut.color)} />
                    {isActive && (
                      <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-brand-400 shadow-sm shadow-brand-400" />
                    )}
                  </NavLink>
                )
              })}

              {/* Botão para Adicionar / Personalizar Atalhos */}
              <button
                type="button"
                id="btn-personalizar-atalhos-header"
                onClick={() => setIsAtalhosModalOpen(true)}
                title={activeShortcuts.length < 4 ? `Adicionar Atalho no Topo (${activeShortcuts.length}/4)` : "Personalizar Atalhos do Topo"}
                className={clsx(
                  "h-9 rounded-xl flex items-center justify-center transition-all duration-150 border cursor-pointer group shrink-0",
                  activeShortcuts.length < 4
                    ? "w-9 border-dashed border-slate-700/80 hover:border-brand-500/50 hover:bg-brand-500/10 text-slate-500 hover:text-brand-300"
                    : "w-8 border-transparent hover:border-slate-700 hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 ml-0.5"
                )}
              >
                {activeShortcuts.length < 4 ? (
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right side controls: Notifications Bell + User Profile Dropdown OU Botão de Login */}
      <div className="flex items-center gap-3.5">
        
        {user ? (
          <>
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
              "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs uppercase shrink-0 border shadow-sm transition-transform group-hover:scale-105 overflow-hidden",
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
              {user?.foto_url ? (
                <img src={user.foto_url} alt={user?.nome || 'Foto'} className="w-full h-full object-cover" />
              ) : (
                (user?.nome || user?.login || 'U').charAt(0)
              )}
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

              {/* Opção: Calendário (apenas para funcionários com acesso) */}
              {permissionsApi.canAccessRoute('/calendario') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    navigate('/calendario')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-sky-400" />
                  <span>Calendário</span>
                </button>
              )}

              {/* Opção 2: Controle de Ponto (Apenas para funcionários) */}
              {isFuncionarioUser() && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsPontoModalOpen(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Controle de Ponto</span>
                </button>
              )}

              {/* Opção 3: RH & Férias (Apenas para funcionários) */}
              {permissionsApi.canAccessRoute('/rh') && (
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
              )}

              {/* Opção 4: Sair */}
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
      </>
    ) : (
      <button
        type="button"
        onClick={onOpenLogin || (() => window.dispatchEvent(new CustomEvent('mantran:open-login')))}
        className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-950/40 border border-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        title="Acessar conta Mantran"
      >
        <LogIn className="w-4 h-4 text-red-200" />
        <span>Login</span>
      </button>
    )}

  </div>

      {/* Modal de Alteração de Senha */}
      <AlterarMinhaSenhaModal
        isOpen={isAlterarSenhaModalOpen}
        onClose={() => setIsAlterarSenhaModalOpen(false)}
      />

      {/* Modal de Controle de Ponto */}
      <ControlePontoModal
        isOpen={isPontoModalOpen}
        onClose={() => setIsPontoModalOpen(false)}
      />

      {/* Modal de Personalização de Atalhos do Topo */}
      <PersonalizarAtalhosModal
        isOpen={isAtalhosModalOpen}
        onClose={() => setIsAtalhosModalOpen(false)}
        user={user}
        currentShortcutIds={shortcutIds}
        onSaved={(newIds) => setShortcutIds(newIds)}
      />
    </header>
  )
}

