import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { permissionsApi } from '../lib/permissions'

export function Login() {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.authenticateUser(login, senha)

      if (!data) {
        throw new Error('Login ou senha incorretos.')
      }

      // Login bem-sucedido
      localStorage.setItem('@Mantran:user', JSON.stringify(data))
      try {
        await permissionsApi.getPermissions()
      } catch (_) {}
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-[420px] text-center">
        
        {/* Logo Mantran */}
        <div className="mb-4 flex justify-center select-none">
          <img 
            src="/Logo_Mantran.png" 
            alt="Mantran Tecnologias" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <h1 className="text-xl font-serif font-bold text-red-800 mt-4 mb-1">Mantran Clientes</h1>
        <p className="text-[11px] text-gray-500 mb-6">Controle de desenvolvimento (API, Testes, Documentação)</p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 ml-1">Login</label>
            <input
              type="text"
              required
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800"
              placeholder="alan"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 ml-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800"
                placeholder="........"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-[10px] text-gray-500">
          Dica: o login foi gerado como o nome em minúsculo sem espaços (ex: alan).
        </div>
      </div>
    </div>
  )
}
