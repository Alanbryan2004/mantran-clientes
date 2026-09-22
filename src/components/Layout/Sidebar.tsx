import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Database, Users, LogOut, Menu, Cloud, Rocket, Shield, ShoppingBag, UserCog } from 'lucide-react'
import { getLoggedUser, isAdminUser } from '../../lib/auth'
import { permissionsApi } from '../../lib/permissions'
import { api } from '../../lib/api'
import { PermissoesModal } from '../PermissoesModal'
import clsx from 'clsx'

const allNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Clientes', path: '/clientes', icon: Users },
  { name: 'Implantações', path: '/implantacoes', icon: Rocket },
  { name: 'Projetos', path: '/bases', icon: Database },
  { name: 'Processamento Shopee', path: '/processamento-shopee', icon: ShoppingBag },
  { name: 'Léo Madeiras', path: '/leo-madeiras', icon: Cloud },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isPermissoesModalOpen, setIsPermissoesModalOpen] = useState(false)
  const [allowedNavItems, setAllowedNavItems] = useState(allNavItems)

  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isParceiro = user?.perfil?.toLowerCase() === 'parceiro'
  const isUsuario = user?.perfil?.toLowerCase() === 'usuario'
  const isCliente = user?.perfil?.toLowerCase() === 'cliente'
  const isComercial = user?.perfil?.toLowerCase() === 'comercial'

  useEffect(() => {
    let isMounted = true

    const updateNav = () => {
      if (!isMounted) return
      
      // Se for perfil Cliente, exibir apenas "Minha Implantação" com link direto
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
      const filtered = allNavItems.filter(item => permissionsApi.canAccessRoute(item.path))
      
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

    return () => {
      isMounted = false
    }
  }, [user?.perfil, isParceiro, isCliente])


  return (
    <div className={clsx(
      "flex flex-col bg-dark-card border-r border-slate-800 text-white transition-all duration-300 relative h-full", 
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

        {/* Admin only: Usuários & Permissões */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1.5">
            <NavLink
              to="/usuarios"
              title={!isExpanded ? 'Usuários do Sistema' : undefined}
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
              <UserCog className="w-5 h-5 flex-shrink-0 text-cyan-400" />
              {isExpanded && <span className="font-medium whitespace-nowrap text-sm">Usuários</span>}
            </NavLink>

            <button
              onClick={() => setIsPermissoesModalOpen(true)}
              title={!isExpanded ? 'Permissões por Perfil' : undefined}
              className={clsx(
                'flex items-center rounded-xl transition-all duration-200 w-full text-slate-400 hover:bg-brand-500/10 hover:text-brand-300 border border-transparent hover:border-brand-500/20',
                isExpanded ? 'px-4 py-2.5 space-x-3' : 'p-3 justify-center'
              )}
            >
              <Shield className="w-5 h-5 text-brand-400 flex-shrink-0" />
              {isExpanded && <span className="font-medium whitespace-nowrap text-sm text-brand-300">Permissões de Acesso</span>}
            </button>
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
