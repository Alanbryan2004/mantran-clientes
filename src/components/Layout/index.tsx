import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
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
          navigate('/', { replace: true })
        }
      }
    }

    checkAccess()
  }, [location.pathname, navigate])

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-dark-bg p-8 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
