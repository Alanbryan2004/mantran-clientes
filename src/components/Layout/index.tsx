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

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-dark-bg p-8 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

