import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { permissionsApi } from '../../lib/permissions'
import { getLoggedUser } from '../../lib/auth'
import { Login } from '../../pages/Login'
import { useEffect, useState } from 'react'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  useEffect(() => {
    const handleOpenLogin = () => setIsLoginModalOpen(true)
    window.addEventListener('mantran:open-login', handleOpenLogin)
    return () => window.removeEventListener('mantran:open-login', handleOpenLogin)
  }, [])

  useEffect(() => {
    const user = getLoggedUser()

    const checkAccess = async () => {
      // Visitante não autenticado pode acessar FAQ, Cidades, Separador e Juntar Planilhas
      if (!user) {
        const isPublic = location.pathname.startsWith('/faq') || 
                         location.pathname.startsWith('/cidades') || 
                         location.pathname.startsWith('/separador') ||
                         location.pathname.startsWith('/juntar') ||
                         location.pathname === '/'
        if (!isPublic) {
          navigate('/faq', { replace: true })
        }
        return
      }

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

  // Telas com tema claro (Tickets, Desenvolvimento & QA, FAQ, Cidades, Separador e Juntar Planilhas): fundo suave cobrindo toda a área rolável
  const isLightRoute = location.pathname.startsWith('/tickets') || 
                       location.pathname.startsWith('/campanha-email') ||
                       location.pathname.startsWith('/dev') || 
                       location.pathname.startsWith('/minhas-tarefas') || 
                       location.pathname.startsWith('/qa-testes') || 
                       location.pathname.startsWith('/cronograma') || 
                       location.pathname.startsWith('/faq') ||
                       location.pathname.startsWith('/cidades') ||
                       location.pathname.startsWith('/separador') ||
                       location.pathname.startsWith('/juntar')

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onOpenLogin={() => setIsLoginModalOpen(true)} />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-8 flex flex-col min-w-0 ${isLightRoute ? 'bg-slate-100' : 'bg-dark-bg'}`}>
          <Outlet />
        </main>
      </div>

      {/* Modal de Login no Desktop */}
      <Login
        isModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}

