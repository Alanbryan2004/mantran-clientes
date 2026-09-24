import { useState } from 'react'
import { X, Lock, KeyRound, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { getLoggedUser } from '../lib/auth'

interface AlterarMinhaSenhaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AlterarMinhaSenhaModal({ isOpen, onClose, onSuccess }: AlterarMinhaSenhaModalProps) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const user = getLoggedUser()

  const handleReset = () => {
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('Sessão expirada. Por favor faça login novamente.')
      return
    }

    if (!senhaAtual.trim()) {
      setError('Por favor, informe sua senha atual.')
      return
    }

    if (novaSenha.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setError('A confirmação da senha não coincide com a nova senha.')
      return
    }

    if (senhaAtual === novaSenha) {
      setError('A nova senha não pode ser igual à senha atual.')
      return
    }

    setLoading(true)
    try {
      // 1. Validar senha atual buscando o usuário
      const isCliente = user.perfil?.toLowerCase() === 'cliente'
      
      if (isCliente) {
        // Se for perfil cliente
        const clienteUser = await api.getUsuarioClienteByEmpresa(user.nome || user.login)
        if (!clienteUser || clienteUser.senha !== senhaAtual.trim()) {
          setError('A senha atual digitada está incorreta.')
          setLoading(false)
          return
        }

        await api.updateUsuarioCliente(clienteUser.id, { senha: novaSenha.trim() })
      } else {
        // Usuário do sistema (Admin, Suporte, Tecnico, etc)
        const allUsers = await api.getUsuariosSistema()
        const currentUserDb = allUsers.find(u => u.id === user.id || u.login?.toLowerCase() === user.login?.toLowerCase())

        if (!currentUserDb || currentUserDb.senha !== senhaAtual.trim()) {
          setError('A senha atual digitada está incorreta.')
          setLoading(false)
          return
        }

        await api.updateUsuarioSistema(currentUserDb.id, { senha: novaSenha.trim() })
      }

      setSuccess(true)
      setTimeout(() => {
        handleReset()
        if (onSuccess) onSuccess()
        onClose()
      }, 1800)
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err)
      setError(err.message || 'Erro ao alterar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Alterar Minha Senha</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {user?.nome || user?.login} ({user?.perfil || 'Usuário'})
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              handleReset()
              onClose()
            }} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Senha alterada com sucesso!</h3>
              <p className="text-xs text-slate-400">Suas credenciais foram atualizadas com segurança.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Senha Atual */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showSenhaAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    required
                    minLength={4}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmarSenha ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="Confirme a nova senha"
                    required
                    minLength={4}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleReset()
                    onClose()
                  }}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 font-bold cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Salvar Senha'}</span>
                </button>
              </div>
            </>
          )}
        </form>

      </div>
    </div>
  )
}
