import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Comercial } from './pages/Comercial'
import { Clientes } from './pages/Clientes'
import { Bases } from './pages/Bases'
import { ProjetoDetalhes } from './pages/ProjetoDetalhes'
import { LeoMadeiras } from './pages/LeoMadeiras'
import { Usuarios } from './pages/Usuarios'
import { RH } from './pages/RH'
import { Implantacoes } from './pages/Implantacoes'
import { ImplantacaoDetalhes } from './pages/ImplantacaoDetalhes'
import { Tickets } from './pages/Tickets'
import { Calendario } from './pages/Calendario'
import { FAQ } from './pages/FAQ'
import { ProcessamentoShopee } from './pages/ProcessamentoShopee'
import { Login } from './pages/Login'
import MinhasTarefas from './pages/dev/MinhasTarefas'
import QATestes from './pages/dev/QATestes'
import DevDashboard from './pages/dev/DevDashboard'
import Pendentes from './pages/dev/Pendentes'
import Finalizadas from './pages/dev/Finalizadas'
import CadastroTelas from './pages/dev/CadastroTelas'
import CronogramaVisualizar from './pages/dev/cronograma/Visualizar'
import CronogramaIncluir from './pages/dev/cronograma/Incluir'
import CronogramaArquitetura from './pages/dev/cronograma/Arquitetura'

import { useState, useEffect } from 'react'
import { permissionsApi } from './lib/permissions'
import { getLoggedUser, isClienteUser } from './lib/auth'
import { api } from './lib/api'
import { VersionGuard } from './components/VersionGuard'
import { CalendarioToast } from './components/CalendarioToast'
import { useIsMobile } from './lib/useIsMobile'

function RootRoute() {
  const user = getLoggedUser()

  // Se não estiver logado, direciona para o FAQ público
  if (!user) {
    return <Navigate to="/faq" replace />
  }

  const isCliente = isClienteUser()
  // Cliente do PORTAL DE TICKETS (logou com o próprio e-mail): vai direto para os chamados
  const isClientePortalTickets = isCliente && !!user?.cliente_email
  const [targetId, setTargetId] = useState<string | null>(user?.implantacao_id || null)
  const [resolving, setResolving] = useState(isCliente && !isClientePortalTickets && !user?.implantacao_id)

  useEffect(() => {
    if (isCliente && !isClientePortalTickets && !user?.implantacao_id) {
      api.getImplantacaoForLoggedCliente(user?.nome || user?.login || '').then(impl => {
        if (impl) {
          if (user) {
            user.implantacao_id = impl.id
            localStorage.setItem('@Mantran:user', JSON.stringify(user))
          }
          setTargetId(impl.id)
        }
        setResolving(false)
      }).catch(() => setResolving(false))
    }
  }, [isCliente, isClientePortalTickets])

  if (isCliente) {
    // Portal de tickets do cliente
    if (isClientePortalTickets) {
      return <Navigate to="/tickets" replace />
    }
    if (resolving) {
      return <div className="flex items-center justify-center p-12 text-slate-400">Carregando implantação...</div>
    }
    if (targetId) {
      return <Navigate to={`/implantacoes/${targetId}`} replace />
    }
    return <Implantacoes />
  }

  // Se o usuário não tem permissão para o Dashboard (/), redireciona para a primeira rota permitida (ex: Comercial -> /comercial ou /implantacoes)
  if (!permissionsApi.canAccessRoute('/')) {
    const firstAllowed = permissionsApi.getFirstAllowedRouteForUser()
    return <Navigate to={firstAllowed || '/comercial'} replace />
  }

  return <Dashboard />
}

function ImplantacoesRoute() {
  const isCliente = isClienteUser()
  const user = getLoggedUser()

  if (isCliente && user?.implantacao_id) {
    return <Navigate to={`/implantacoes/${user.implantacao_id}`} replace />
  }

  return <Implantacoes />
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    const user = localStorage.getItem('@Mantran:user')
    if (user) {
      setIsAuthenticated(true)
      permissionsApi.getPermissions().catch(console.error)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-white">Carregando...</div>
  }

  // No Celular / Mobile: se não autenticado e não for a tela de FAQ, vai direto para o Login.
  // Permite que clientes acessem o FAQ diretamente no celular via links compartilhados.
  const isFaqPath = window.location.pathname.startsWith('/faq')
  if (!isAuthenticated && isMobile && !isFaqPath) {
    return (
      <>
        <VersionGuard />
        <Login />
      </>
    )
  }

  // No Desktop: carrega o layout com o FAQ disponível para consulta pública.
  // Visitantes no Desktop contam com botão de Login no Header e Sidebar que abre o modal.
  return (
    <>
      <VersionGuard />
      <BrowserRouter>
        {isAuthenticated && <CalendarioToast />}
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<RootRoute />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:numero" element={<Tickets />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="comercial" element={<Comercial />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="implantacoes" element={<ImplantacoesRoute />} />
            <Route path="implantacoes/:id" element={<ImplantacaoDetalhes />} />
            <Route path="bases" element={<Bases />} />
            <Route path="bases/:id" element={<ProjetoDetalhes />} />
            <Route path="processamento-shopee" element={<ProcessamentoShopee />} />
            <Route path="leo-madeiras" element={<LeoMadeiras />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="rh" element={<RH />} />

            {/* Módulos de Desenvolvimento & QA (Mantran Web API Integrado) */}
            <Route path="dev/tarefas" element={<MinhasTarefas />} />
            <Route path="dev/qa" element={<QATestes />} />
            <Route path="dev/dashboard" element={<DevDashboard />} />
            <Route path="dev/pendentes" element={<Pendentes />} />
            <Route path="dev/finalizadas" element={<Finalizadas />} />
            <Route path="dev/cadastro-telas" element={<CadastroTelas />} />
            <Route path="dev/cronograma" element={<Navigate to="/dev/cronograma/visualizar" replace />} />
            <Route path="dev/cronograma/visualizar" element={<CronogramaVisualizar />} />
            <Route path="dev/cronograma/incluir" element={<CronogramaIncluir />} />
            <Route path="dev/cronograma/arquitetura" element={<CronogramaArquitetura />} />

            {/* Aliases diretos para máxima compatibilidade */}
            <Route path="minhas-tarefas" element={<Navigate to="/dev/tarefas" replace />} />
            <Route path="qa-testes" element={<Navigate to="/dev/qa" replace />} />
            <Route path="cronograma" element={<Navigate to="/dev/cronograma/visualizar" replace />} />
            <Route path="cronograma/visualizar" element={<Navigate to="/dev/cronograma/visualizar" replace />} />
            <Route path="cronograma/incluir" element={<Navigate to="/dev/cronograma/incluir" replace />} />
            <Route path="cronograma/arquitetura" element={<Navigate to="/dev/cronograma/arquitetura" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App


