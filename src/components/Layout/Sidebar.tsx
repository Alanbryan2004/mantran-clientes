import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Database, Users, LogOut, Menu, Cloud, 
  Rocket, Shield, ShoppingBag, UserCog, TrendingUp, Users2, Ticket,
  ChevronDown, Code2, Clock, FlaskConical, ListFilter, CheckCircle2,
  Calendar, PlusCircle, BookOpen, LogIn
} from 'lucide-react'
import { getLoggedUser, isAdminUser } from '../../lib/auth'
import { permissionsApi } from '../../lib/permissions'
import { api } from '../../lib/api'
import { PermissoesModal } from '../PermissoesModal'
import clsx from 'clsx'

const allNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Tickets', path: '/tickets', icon: Ticket },
  { name: 'Comercial', path: '/comercial', icon: TrendingUp },
  { name: 'Clientes', path: '/clientes', icon: Users },
  { name: 'Implantações', path: '/implantacoes', icon: Rocket },
  { name: 'Projetos', path: '/bases', icon: Database },
  { name: 'Processamento Shopee', path: '/processamento-shopee', icon: ShoppingBag },
  { name: 'Léo Madeiras', path: '/leo-madeiras', icon: Cloud },
  { name: 'Gestão de RH', path: '/rh', icon: Users2 },
  { name: 'FAQ', path: '/faq', icon: BookOpen },
]

interface DevSubItem {
  name: string
  path: string
  adminOnly?: boolean
  tecnicoOrAdminOnly?: boolean
}

interface DevNavItem {
  name: string
  path: string
  icon: any
  color?: string
  subitems?: DevSubItem[]
}

const devNavItems: DevNavItem[] = [
  { name: 'Minhas Tarefas', path: '/dev/tarefas', icon: Clock, color: 'text-amber-400' },
  { name: 'QA & Testes', path: '/dev/qa', icon: FlaskConical, color: 'text-purple-400' },
  { name: 'Dashboard Dev', path: '/dev/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
  { name: 'Telas Pendentes', path: '/dev/pendentes', icon: ListFilter, color: 'text-cyan-400' },
  { name: 'Telas Finalizadas', path: '/dev/finalizadas', icon: CheckCircle2, color: 'text-emerald-400' },
  { name: 'Cadastro de Telas', path: '/dev/cadastro-telas', icon: PlusCircle, color: 'text-rose-400' },
  { 
    name: 'Cronograma', 
    path: '/dev/cronograma', 
    icon: Calendar, 
    color: 'text-indigo-400',
    subitems: [
      { name: 'Incluir', path: '/dev/cronograma/incluir', adminOnly: true },
      { name: 'Visualizar', path: '/dev/cronograma/visualizar' },
      { name: 'Arquitetura', path: '/dev/cronograma/arquitetura', tecnicoOrAdminOnly: true },
    ]
  },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPermissoesModalOpen, setIsPermissoesModalOpen] = useState(false)
  const [allowedNavItems, setAllowedNavItems] = useState(allNavItems)

  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isParceiro = user?.perfil?.toLowerCase() === 'parceiro'
  const isCliente = user?.perfil?.toLowerCase() === 'cliente'

  const location = useLocation()
  const isTecnico = user?.perfil?.toLowerCase().includes('tecnico') || false
  const [allowedDevItems, setAllowedDevItems] = useState<DevNavItem[]>([])
  const isDevActive = location.pathname.startsWith('/dev') || 
                      location.pathname.startsWith('/minhas-tarefas') || 
                      location.pathname.startsWith('/qa-testes') || 
                      location.pathname.startsWith('/cronograma')
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(isDevActive || isTecnico)
  const [isCollapsedDevMenuOpen, setIsCollapsedDevMenuOpen] = useState(false)
  const collapsedDevMenuRef = useRef<HTMLDivElement>(null)

  const isCronogramaActive = location.pathname.startsWith('/dev/cronograma') || 
                             location.pathname.startsWith('/cronograma')
  const [isCronogramaOpen, setIsCronogramaOpen] = useState(isCronogramaActive)

  useEffect(() => {
    if (isCronogramaActive) {
      setIsCronogramaOpen(true)
    }
  }, [isCronogramaActive])

  const isUsuariosActive = location.pathname.startsWith('/usuarios')
  const [isUsuariosDropdownOpen, setIsUsuariosDropdownOpen] = useState(isUsuariosActive)
  const [isCollapsedMenuOpen, setIsCollapsedMenuOpen] = useState(false)
  const collapsedMenuRef = useRef<HTMLDivElement>(null)

  // Auto-abre o dropdown quando estiver na rota /usuarios ou /dev
  useEffect(() => {
    if (isUsuariosActive) {
      setIsUsuariosDropdownOpen(true)
    }
  }, [isUsuariosActive])

  useEffect(() => {
    if (isDevActive) {
      setIsDevDropdownOpen(true)
    }
  }, [isDevActive])

  // Fecha o menu flutuante colapsado ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (collapsedMenuRef.current && !collapsedMenuRef.current.contains(event.target as Node)) {
        setIsCollapsedMenuOpen(false)
      }
      if (collapsedDevMenuRef.current && !collapsedDevMenuRef.current.contains(event.target as Node)) {
        setIsCollapsedDevMenuOpen(false)
      }
    }
    if (isCollapsedMenuOpen || isCollapsedDevMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCollapsedMenuOpen, isCollapsedDevMenuOpen])

  // Fecha os menus flutuantes quando a sidebar se expande
  useEffect(() => {
    if (isExpanded) {
      setIsCollapsedMenuOpen(false)
      setIsCollapsedDevMenuOpen(false)
    }
  }, [isExpanded])

  useEffect(() => {
    let isMounted = true

    const updateNav = () => {
      if (!isMounted) return

      // Visitante não autenticado: visualiza apenas o FAQ
      if (!user) {
        setAllowedNavItems([
          { name: 'FAQ', path: '/faq', icon: BookOpen }
        ])
        setAllowedDevItems([])
        return
      }

      // Filtrar itens de Desenvolvimento & QA com base no Controle de Permissões
      const filteredDev = devNavItems.filter(item => {
        if (isAdmin) return true
        return permissionsApi.canAccessRoute(item.path)
      })
      setAllowedDevItems(filteredDev)
      
      // Cliente do portal de tickets (logou com o próprio e-mail): "Meus Chamados" + FAQ
      if (isCliente && user?.cliente_email) {
        setAllowedNavItems([
          { name: 'Meus Chamados', path: '/tickets', icon: Ticket },
          { name: 'FAQ', path: '/faq', icon: BookOpen }
        ])
        return
      }

      // Se for perfil Cliente (legado por implantação): "Minha Implantação" + FAQ
      if (isCliente) {
        const directPath = user?.implantacao_id ? `/implantacoes/${user.implantacao_id}` : '/implantacoes'
        setAllowedNavItems([
          { name: 'Minha Implantação', path: directPath, icon: Rocket },
          { name: 'FAQ', path: '/faq', icon: BookOpen }
        ])

        if (!user?.implantacao_id) {
          api.getImplantacaoForLoggedCliente(user?.nome || user?.login || '').then(impl => {
            if (impl && isMounted) {
              if (user) {
                user.implantacao_id = impl.id
                localStorage.setItem('@Mantran:user', JSON.stringify(user))
              }
              setAllowedNavItems([
                { name: 'Minha Implantação', path: `/implantacoes/${impl.id}`, icon: Rocket },
                { name: 'FAQ', path: '/faq', icon: BookOpen }
              ])
            }
          }).catch(console.error)
        }
        return
      }

      // Filter accessible navigation items
      const filtered = allNavItems.filter(item => {
        return permissionsApi.canAccessRoute(item.path)
      })
      
      // If user has a specific restricted project (e.g. Parceiro), link directly to that project
      const specificProjId = permissionsApi.getAllowedProjectForUser()
      const mapped = filtered.map(item => {
        if (item.path === '/bases' && specificProjId) {
          return {
            ...item,
            name: isParceiro ? 'Meu Projeto' : 'Projeto',
            path: `/bases/${specificProjId}`
          }
        }
        if (item.path === '/rh') {
          return {
            ...item,
            name: isAdmin ? 'Gestão de RH' : 'RH & Férias'
          }
        }
        return item
      })

      setAllowedNavItems(mapped)
    }

    updateNav()

    // Also fetch fresh permissions from Supabase
    permissionsApi.getPermissions().then(() => {
      updateNav()
    }).catch(err => {
      console.error('Erro ao atualizar permissões:', err)
    })

    const handlePermissionsUpdated = () => {
      if (isMounted) {
        updateNav()
      }
    }
    window.addEventListener('mantran:permissions-updated', handlePermissionsUpdated)

    return () => {
      isMounted = false
      window.removeEventListener('mantran:permissions-updated', handlePermissionsUpdated)
    }
  }, [user?.perfil, isParceiro, isCliente])


  return (
    <div className={clsx(
      "flex flex-col bg-dark-card border-r border-slate-800 text-white transition-all duration-300 relative h-full z-20", 
      isExpanded ? "w-72" : "w-20"
    )}>
      
      <div className={clsx("flex items-center h-16 border-b border-slate-800", isExpanded ? "px-4 space-x-4" : "justify-center")}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer focus:outline-none flex-shrink-0"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {isExpanded && (
          <div className="flex items-center select-none overflow-hidden py-1">
            <img 
              src="/Logo_Mantran_Branco.png" 
              onError={(e) => { e.currentTarget.src = '/Logo_Mantran.png' }}
              alt="Mantran Tecnologias" 
              className="h-9 w-auto object-contain"
            />
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden px-3 mt-1">
        {allowedNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={!isExpanded ? item.name : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-xl transition-all duration-200',
                  isExpanded ? 'px-3.5 py-2 space-x-3' : 'p-2.5 justify-center',
                  isActive 
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                )
              }
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {isExpanded && <span className="font-medium whitespace-nowrap text-[13px]">{item.name}</span>}
            </NavLink>
          )
        })}

        {/* Módulo Desenvolvimento & QA */}
        {allowedDevItems.length > 0 && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 space-y-1">
            <div className="relative" ref={collapsedDevMenuRef}>
              <div
                className={clsx(
                  'flex items-center rounded-xl transition-all duration-200 group',
                  isDevActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent',
                  isExpanded ? 'pr-2' : 'justify-center'
                )}
              >
                {isExpanded ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsDevDropdownOpen(!isDevDropdownOpen)}
                      className="flex items-center flex-1 px-3.5 py-2 space-x-3 min-w-0 text-left cursor-pointer"
                    >
                      <Code2 className="w-[18px] h-[18px] flex-shrink-0 text-amber-400" />
                      <span className="font-medium whitespace-nowrap text-[13px] truncate">Desenvolvimento & QA</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDevDropdownOpen(!isDevDropdownOpen)
                      }}
                      title={isDevDropdownOpen ? 'Recolher Desenvolvimento' : 'Expandir Desenvolvimento'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={clsx(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          isDevDropdownOpen && 'rotate-180 text-brand-400'
                        )}
                      />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCollapsedDevMenuOpen(!isCollapsedDevMenuOpen)}
                    title="Desenvolvimento & QA"
                    className="p-2.5 flex items-center justify-center cursor-pointer focus:outline-none w-full"
                  >
                    <Code2 className={clsx("w-[18px] h-[18px] flex-shrink-0", isDevActive ? "text-brand-400" : "text-amber-400")} />
                  </button>
                )}
              </div>

              {/* Submenu inline quando expandido */}
              {isExpanded && isDevDropdownOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {allowedDevItems.map((item) => {
                    const ItemIcon = item.icon
                    const hasSubitems = Array.isArray(item.subitems) && item.subitems.length > 0

                    if (hasSubitems) {
                      const isItemActive = location.pathname.startsWith(item.path) || (item.path === '/dev/cronograma' && location.pathname.startsWith('/cronograma'))
                      const filteredSub = (item.subitems || []).filter(sub => {
                        if (sub.adminOnly && !isAdmin) return false
                        if (sub.tecnicoOrAdminOnly && !isAdmin && !isTecnico) return false
                        return true
                      })

                      return (
                        <div key={item.name} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setIsCronogramaOpen(!isCronogramaOpen)}
                            className={clsx(
                              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all group cursor-pointer text-left',
                              isItemActive
                                ? 'bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ItemIcon className={clsx("w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110", item.color)} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <ChevronDown
                              className={clsx(
                                'w-3.5 h-3.5 transition-transform duration-200 shrink-0 text-slate-400',
                                isCronogramaOpen && 'rotate-180 text-brand-400'
                              )}
                            />
                          </button>

                          {isCronogramaOpen && (
                            <div className="ml-3 pl-2 border-l border-slate-700/80 space-y-0.5 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              {filteredSub.map((sub) => (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  className={({ isActive }) =>
                                    clsx(
                                      'flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors',
                                      isActive
                                        ? 'bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium'
                                    )
                                  }
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                  <span className="truncate">{sub.name}</span>
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all group',
                            isActive
                              ? 'bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                          )
                        }
                      >
                        <ItemIcon className={clsx("w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110", item.color)} />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}

              {/* Menu Flutuante Popover quando sidebar recolhida (!isExpanded) */}
              {!isExpanded && isCollapsedDevMenuOpen && (
                <div className="absolute left-full top-0 ml-3 w-56 bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
                  <div className="px-3 py-1.5 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Dev & QA</span>
                  </div>
                  {allowedDevItems.map((item) => {
                    const ItemIcon = item.icon
                    const hasSubitems = Array.isArray(item.subitems) && item.subitems.length > 0

                    if (hasSubitems) {
                      const filteredSub = (item.subitems || []).filter(sub => {
                        if (sub.adminOnly && !isAdmin) return false
                        if (sub.tecnicoOrAdminOnly && !isAdmin && !isTecnico) return false
                        return true
                      })
                      return (
                        <div key={item.name} className="pt-1.5 mt-1.5 border-t border-slate-800/80 space-y-1">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <ItemIcon className="w-3.5 h-3.5" />
                            <span>{item.name}</span>
                          </div>
                          {filteredSub.map(sub => (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setIsCollapsedDevMenuOpen(false)}
                              className={({ isActive }) =>
                                clsx(
                                  'flex items-center gap-2 pl-5 pr-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                                  isActive
                                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-bold'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                )
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              <span>{sub.name}</span>
                            </NavLink>
                          ))}
                        </div>
                      )
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsCollapsedDevMenuOpen(false)}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                          )
                        }
                      >
                        <ItemIcon className={clsx("w-4 h-4 shrink-0", item.color)} />
                        <span>{item.name}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin only: Usuários com Dropdown de Permissões */}
        {isAdmin && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 space-y-1">
            <div className="relative" ref={collapsedMenuRef}>
              <div
                className={clsx(
                  'flex items-center rounded-xl transition-all duration-200 group',
                  isUsuariosActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent',
                  isExpanded ? 'pr-2' : 'justify-center'
                )}
              >
                {isExpanded ? (
                  <>
                    <NavLink
                      to="/usuarios"
                      onClick={() => setIsUsuariosDropdownOpen(true)}
                      className="flex items-center flex-1 px-3.5 py-2 space-x-3 min-w-0"
                    >
                      <UserCog className="w-[18px] h-[18px] flex-shrink-0 text-cyan-400" />
                      <span className="font-medium whitespace-nowrap text-[13px] truncate">Usuários</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsUsuariosDropdownOpen(!isUsuariosDropdownOpen)
                      }}
                      title={isUsuariosDropdownOpen ? 'Recolher Permissões' : 'Ver Permissões de Acesso'}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={clsx(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          isUsuariosDropdownOpen && 'rotate-180 text-brand-400'
                        )}
                      />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCollapsedMenuOpen(!isCollapsedMenuOpen)}
                    title="Usuários & Permissões"
                    className="p-2.5 flex items-center justify-center cursor-pointer focus:outline-none w-full"
                  >
                    <UserCog className="w-[18px] h-[18px] flex-shrink-0 text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Submenu inline quando expandido */}
              {isExpanded && isUsuariosDropdownOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => setIsPermissoesModalOpen(true)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20 transition-all w-full text-left cursor-pointer group"
                  >
                    <Shield className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Permissões de Acesso</span>
                  </button>
                </div>
              )}

              {/* Menu Flutuante Popover quando sidebar recolhida (!isExpanded) */}
              {!isExpanded && isCollapsedMenuOpen && (
                <div className="absolute left-full top-0 ml-3 w-52 bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-3 py-1.5 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Usuários
                  </div>
                  <NavLink
                    to="/usuarios"
                    onClick={() => setIsCollapsedMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      )
                    }
                  >
                    <UserCog className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Usuários do Sistema</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollapsedMenuOpen(false)
                      setIsPermissoesModalOpen(true)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors w-full text-left cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>Permissões de Acesso</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className={clsx("border-t border-slate-800/80", isExpanded ? "p-3" : "p-2")}>
        {user ? (
          <button 
            onClick={() => {
              localStorage.removeItem('@Mantran:user')
              window.location.href = '/'
            }}
            title={!isExpanded ? 'Sair' : undefined}
            className={clsx(
              "flex items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200 w-full cursor-pointer",
              isExpanded ? "px-3.5 py-2 space-x-3" : "p-2.5 justify-center"
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {isExpanded && <span className="text-[13px] font-medium">Sair</span>}
          </button>
        ) : (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('mantran:open-login'))}
            title={!isExpanded ? 'Fazer Login' : undefined}
            className={clsx(
              "flex items-center rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 w-full cursor-pointer font-medium",
              isExpanded ? "px-3.5 py-2 space-x-3" : "p-2.5 justify-center"
            )}
          >
            <LogIn className="w-[18px] h-[18px] flex-shrink-0" />
            {isExpanded && <span className="text-[13px] font-medium">Login</span>}
          </button>
        )}
      </div>

      {/* Modal de Permissões */}
      <PermissoesModal
        isOpen={isPermissoesModalOpen}
        onClose={() => {
          setIsPermissoesModalOpen(false)
          // Refilter
          const filtered = allNavItems.filter(item => permissionsApi.canAccessRoute(item.path))
          setAllowedNavItems(filtered)
        }}
      />
    </div>
  )
}
