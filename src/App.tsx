import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Clientes } from './pages/Clientes'
import { Bases } from './pages/Bases'
import { ProjetoDetalhes } from './pages/ProjetoDetalhes'
import { LeoMadeiras } from './pages/LeoMadeiras'
import { Usuarios } from './pages/Usuarios'
import { Login } from './pages/Login'

import { useState, useEffect } from 'react'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('@Mantran:user')
    if (user) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-white">Carregando...</div>
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="bases" element={<Bases />} />
          <Route path="bases/:id" element={<ProjetoDetalhes />} />
          <Route path="leo-madeiras" element={<LeoMadeiras />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
