import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Clientes } from './pages/Clientes'
import { Bases } from './pages/Bases'
import { ProjetoDetalhes } from './pages/ProjetoDetalhes'
import { LeoMadeiras } from './pages/LeoMadeiras'
import { Usuarios } from './pages/Usuarios'
import { Implantacoes } from './pages/Implantacoes'
import { ImplantacaoDetalhes } from './pages/ImplantacaoDetalhes'
import { ProcessamentoShopee } from './pages/ProcessamentoShopee'
import { Login } from './pages/Login'

import { useState, useEffect } from 'react'
import { permissionsApi } from './lib/permissions'
import { getLoggedUser, isClienteUser } from './lib/auth'
import { api } from './lib/api'

function RootRoute() {
  const isCliente = isClienteUser()
  const user = getLoggedUser()
  const [targetId, setTargetId] = useState<string | null>(user?.implantacao_id || null)
  const [resolving, setResolving] = useState(isCliente && !user?.implantacao_id)

  useEffect(() => {
    if (isCliente && !user?.implantacao_id) {
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
  }, [isCliente])

  if (isCliente) {
    if (resolving) {
      return <div className="flex items-center justify-center p-12 text-slate-400">Carregando implantação...</div>
    }
    if (targetId) {
      return <Navigate to={`/implantacoes/${targetId}`} replace />
    }
    return <Implantacoes />
  }

  // Se o usuário não tem permissão para o Dashboard (/), redireciona para a primeira rota permitida (ex: Comercial -> /implantacoes)
  if (!permissionsApi.canAccessRoute('/')) {
    const firstAllowed = permissionsApi.getFirstAllowedRouteForUser()
    return <Navigate to={firstAllowed || '/implantacoes'} replace />
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

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RootRoute />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="implantacoes" element={<ImplantacoesRoute />} />
          <Route path="implantacoes/:id" element={<ImplantacaoDetalhes />} />
          <Route path="bases" element={<Bases />} />
          <Route path="bases/:id" element={<ProjetoDetalhes />} />
          <Route path="processamento-shopee" element={<ProcessamentoShopee />} />
          <Route path="leo-madeiras" element={<LeoMadeiras />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

