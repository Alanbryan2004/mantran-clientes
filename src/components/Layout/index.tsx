import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { permissionsApi } from '../../lib/permissions'
import { useEffect } from 'react'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAccess = async () => {
      let isAllowed = permissionsApi.canAccessRoute(location.pathname)
      if (!isAllowed) {
        // Tentar obter as permissões mais recentes do banco antes de redirecionar
        await permissionsApi.getPermissions()
        isAllowed = permissionsApi.canAccessRoute(location.pathname)
      }

      if (!isAllowed) {
        const allowedProjId = permissionsApi.getAllowedProjectForUser()
        if (allowedProjId) {
          navigate(`/bases/${allowedProjId}`, { replace: true })
        } else {
          const firstAllowed = permissionsApi.getFirstAllowedRouteForUser()
          navigate(firstAllowed || '/implantacoes', { replace: true })
        }
      }
    }

    checkAccess()
  }, [location.pathname, navigate])

  // A tela de Tickets usa tema claro (estilo Freshdesk): fundo claro cobrindo toda a área rolável
  const isTicketsRoute = location.pathname.startsWith('/tickets')

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-8 flex flex-col min-w-0 ${isTicketsRoute ? 'bg-slate-100' : 'bg-dark-bg'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

