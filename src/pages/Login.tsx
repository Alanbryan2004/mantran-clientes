import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { api } from '../lib/api'
import { permissionsApi } from '../lib/permissions'

export interface LoginProps {
  isModal?: boolean
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export function Login({ isModal = false, isOpen = true, onClose, onSuccess }: LoginProps = {}) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fecha modal ao pressionar ESC
  useEffect(() => {
    if (!isModal || !isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, isOpen, onClose])

  if (isModal && !isOpen) return null

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

      if (onSuccess) {
        onSuccess()
      } else {
        // Redirecionamento direto para evitar telas piscando
        if (data.perfil === 'Cliente') {
          // Cliente que logou com o próprio e-mail vai para o portal de tickets;
          // cliente legado (por implantação) vai para a implantação dele.
          const dest = (data as any).cliente_email
            ? '/tickets'
            : data.implantacao_id ? `/implantacoes/${data.implantacao_id}` : '/implantacoes'
          window.location.href = dest
        } else {
          window.location.href = '/'
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.')
    } finally {
      setLoading(false)
    }
  }

  const cardContent = (
    <div 
      className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[420px] text-center relative border border-slate-200 animate-in zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      {/* Botão de Fechar no Modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      )}

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
            autoFocus
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
          className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 text-[10px] text-gray-500">
        Dica: o login foi gerado como o nome em minúsculo sem espaços (ex: alan).
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 font-sans">
      {cardContent}
    </div>
  )
}
