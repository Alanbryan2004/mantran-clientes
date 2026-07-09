import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: fetchError } = await supabase
        .from('usuario')
        .select('*')
        .eq('login', login.toLowerCase())
        .eq('senha', senha)
        .eq('ativo', true)
        .single()

      if (fetchError || !data) {
        throw new Error('Login ou senha incorretos.')
      }

      // Login bem-sucedido
      localStorage.setItem('@Mantran:user', JSON.stringify(data))
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
        
        {/* Logo Approximation */}
        <div className="mb-2">
          <div className="text-4xl font-black text-gray-800 flex justify-center items-center tracking-tighter">
            MAN
            <div className="mx-0.5 w-8 h-8 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center relative shadow-inner">
              <div className="absolute top-0 w-full h-1/2 bg-red-600 rounded-t-full opacity-80"></div>
              <span className="text-white z-10 text-2xl" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>T</span>
            </div>
            RAN
          </div>
          <div className="text-[13px] font-bold text-red-600 tracking-[0.15em] mt-1">TECNOLOGIAS</div>
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
            <input
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800"
              placeholder="........"
            />
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
