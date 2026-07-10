import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Database, Users, LogOut, Menu, Cloud } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Clientes', path: '/clientes', icon: Users },
  { name: 'Projetos', path: '/bases', icon: Database },
  { name: 'Léo Madeiras', path: '/leo-madeiras', icon: Cloud },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={clsx(
      "flex flex-col bg-dark-card border-r border-slate-800 text-white transition-all duration-300 relative h-full", 
      isExpanded ? "w-72" : "w-20"
    )}>
      
      <div className={clsx("flex items-center h-16 border-b border-slate-800", isExpanded ? "px-4 space-x-4" : "justify-center")}>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer focus:outline-none flex-shrink-0">
          <Menu className="w-6 h-6" />
        </button>
        
        {isExpanded && (
          <div className="flex flex-col justify-center select-none overflow-hidden">
            <div className="flex items-center space-x-0.5">
              <span className="text-2xl font-black tracking-tighter text-white">MAN</span>
              <span className="text-3xl font-black text-brand-500 leading-none">T</span>
              <span className="text-2xl font-black tracking-tighter text-white">RAN</span>
            </div>
            <span className="text-[10px] font-bold text-brand-500 tracking-[0.15em] -mt-1 pl-0.5">TECNOLOGIAS</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden px-4 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={!isExpanded ? item.name : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-xl transition-all duration-200',
                  isExpanded ? 'px-4 py-3 space-x-3' : 'p-3 justify-center',
                  isActive 
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="font-medium whitespace-nowrap">{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => {
            localStorage.removeItem('@Mantran:user')
            window.location.href = '/'
          }}
          title={!isExpanded ? 'Sair' : undefined}
          className={clsx(
            "flex items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200 w-full",
            isExpanded ? "px-4 py-3 space-x-3" : "p-3 justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </div>
  )
}



