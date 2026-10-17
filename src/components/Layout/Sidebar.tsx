import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Database, Users, LogOut, Menu, Cloud, 
  Rocket, Shield, ShoppingBag, UserCog, TrendingUp, Users2, Ticket,
  ChevronDown, Code2, Clock, FlaskConical, ListFilter, CheckCircle2,
  Calendar, PlusCircle
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
]

const devNavItems = [
  { name: 'Minhas Tarefas', path: '/dev/tarefas', icon: Clock, color: 'text-amber-400' },
  { name: 'QA & Testes', path: '/dev/qa', icon: FlaskConical, color: 'text-purple-400' },
  { name: 'Dashboard Dev', path: '/dev/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
  { name: 'Telas Pendentes', path: '/dev/pendentes', icon: ListFilter, color: 'text-cyan-400' },
  { name: 'Telas Finalizadas', path: '/dev/finalizadas', icon: CheckCircle2, color: 'text-emerald-400' },
  { name: 'Cadastro de Telas', path: '/dev/cadastro-telas', icon: PlusCircle, color: 'text-rose-400' },
  { name: 'Cronograma', path: '/dev/cronograma/visualizar', icon: Calendar, color: 'text-indigo-400' },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPermissoesModalOpen, setIsPermissoesModalOpen] = useState(false)
  const [allowedNavItems, setAllowedNavItems] = useState(allNavItems)

  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isParceiro = user?.perfil?.toLowerCase() === 'parceiro'
  const isUsuario = user?.perfil?.toLowerCase() === 'usuario'
  const isCliente = user?.perfil?.toLowerCase() === 'cliente'
  const isComercial = user?.perfil?.toLowerCase() === 'comercial'

  const location = useLocation()
  const isTecnico = user?.perfil?.toLowerCase().includes('tecnico') || false
  const [allowedDevItems, setAllowedDevItems] = useState(devNavItems)
  const isDevActive = location.pathname.startsWith('/dev') || 
                      location.pathname.startsWith('/minhas-tarefas') || 
                      location.pathname.startsWith('/qa-testes') || 
                      location.pathname.startsWith('/cronograma')
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(isDevActive || isTecnico)
  const [isCollapsedDevMenuOpen, setIsCollapsedDevMenuOpen] = useState(false)
  const collapsedDevMenuRef = useRef<HTMLDivElement>(null)

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
      
      // Cliente do portal de tickets (logou com o próprio e-mail): só "Meus Chamados"
      if (isCliente && user?.cliente_email) {
        setAllowedNavItems([
          { name: 'Meus Chamados', path: '/tickets', icon: Ticket }
        ])
        return
      }

      // Se for perfil Cliente (legado por implantação), exibir apenas "Minha Implantação"
      if (isCliente) {
        const directPath = user?.implantacao_id ? `/implantacoes/${user.implantacao_id}` : '/implantacoes'
        setAllowedNavItems([
          { name: 'Minha Implantação', path: directPath, icon: Rocket }
        ])

        if (!user?.implantacao_id) {
          api.getImplantacaoForLoggedCliente(user?.nome || user?.login || '').then(impl => {
            if (impl && isMounted) {
              if (user) {
                user.implantacao_id = impl.id
                localStorage.setItem('@Mantran:user', JSON.stringify(user))
              }
              setAllowedNavItems([
                { name: 'Minha Implantação', path: `/implantacoes/${impl.id}`, icon: Rocket }
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

      // Filter accessible dev navigation items
      if (isParceiro || isCliente) {
        setAllowedDevItems([])
      } else {
        const filteredDev = devNavItems.filter(item => {
          if (isAdmin) return true
          return permissionsApi.canAccessRoute(item.path)
        })
        setAllowedDevItems(filteredDev)
      }
    }

    updateNav()

    // Also fetch fresh permissions from Supabase
    permissionsApi.getPermissions().then(() => {
      updateNav()
    }).catch(err => {
      console.error('Erro ao atualizar permissões:', err)
    })

    return () => {
      isMounted = false
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

      <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 mt-2">
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
                  isExpanded ? 'px-4 py-2.5 space-x-3' : 'p-3 justify-center',
                  isActive 
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="font-medium whitespace-nowrap text-sm">{item.name}</span>}
            </NavLink>
          )
        })}

        {/* Módulo Desenvolvimento & QA */}
        {allowedDevItems.length > 0 && (
          <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
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
                      className="flex items-center flex-1 px-4 py-2.5 space-x-3 min-w-0 text-left cursor-pointer"
                    >
                      <Code2 className="w-5 h-5 flex-shrink-0 text-amber-400" />
                      <span className="font-medium whitespace-nowrap text-sm truncate">Desenvolvimento & QA</span>
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
                          'w-4 h-4 transition-transform duration-200',
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
                    className="p-3 flex items-center justify-center cursor-pointer focus:outline-none w-full"
                  >
                    <Code2 className={clsx("w-5 h-5 flex-shrink-0", isDevActive ? "text-brand-400" : "text-amber-400")} />
                  </button>
                )}
              </div>

              {/* Submenu inline quando expandido */}
              {isExpanded && isDevDropdownOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {allowedDevItems.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                            isActive
                              ? 'bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                          )
                        }
                      >
                        <ItemIcon className={clsx("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", item.color)} />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}

              {/* Menu Flutuante Popover quando sidebar recolhida (!isExpanded) */}
              {!isExpanded && isCollapsedDevMenuOpen && (
                <div className="absolute left-full top-0 ml-3 w-56 bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-3 py-1.5 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Dev & QA</span>
                  </div>
                  {allowedDevItems.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsCollapsedDevMenuOpen(false)}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
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
          <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
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
                      className="flex items-center flex-1 px-4 py-2.5 space-x-3 min-w-0"
                    >
                      <UserCog className="w-5 h-5 flex-shrink-0 text-cyan-400" />
                      <span className="font-medium whitespace-nowrap text-sm truncate">Usuários</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsUsuariosDropdownOpen(!isUsuariosDropdownOpen)
                      }}
                      title={isUsuariosDropdownOpen ? 'Recolher Permissões' : 'Ver Permissões de Acesso'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={clsx(
                          'w-4 h-4 transition-transform duration-200',
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
                    className="p-3 flex items-center justify-center cursor-pointer focus:outline-none w-full"
                  >
                    <UserCog className="w-5 h-5 flex-shrink-0 text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Submenu inline quando expandido */}
              {isExpanded && isUsuariosDropdownOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => setIsPermissoesModalOpen(true)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20 transition-all w-full text-left cursor-pointer group"
                  >
                    <Shield className="w-4 h-4 text-brand-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
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

      <div className="p-4 border-t border-slate-800 space-y-2">
        {isExpanded && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className={clsx(
              "w-8 h-8 rounded-full border font-bold flex items-center justify-center text-xs uppercase shrink-0",
              isParceiro
                ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                : isComercial
                ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                : isUsuario
                ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                : isCliente
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-brand-500/20 border-brand-500/30 text-brand-400"
            )}>
              {(user?.nome || user?.login || 'U').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user?.nome || user?.login || 'Usuário'}
              </p>
              <span className={clsx(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5 border",
                isParceiro
                  ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                  : isComercial
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                  : isUsuario
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : isCliente
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-brand-500/10 text-brand-400 border-brand-500/20"
              )}>
                {isParceiro 
                  ? '🤝 Parceiro' 
                  : isComercial
                  ? '💼 Comercial'
                  : isUsuario 
                  ? '🔒 Consulta' 
                  : isCliente
                  ? '🏢 Cliente'
                  : user?.perfil || 'Acesso Total'}
              </span>
            </div>
          </div>
        )}


        <button 
          onClick={() => {
            localStorage.removeItem('@Mantran:user')
            window.location.href = '/'
          }}
          title={!isExpanded ? 'Sair' : undefined}
          className={clsx(
            "flex items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200 w-full",
            isExpanded ? "px-4 py-2.5 space-x-3" : "p-3 justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {isExpanded && <span className="text-sm font-medium">Sair</span>}
        </button>
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
