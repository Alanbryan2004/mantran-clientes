import { useState, useEffect } from 'react'
import { X, ShoppingCart, Save, Eye, EyeOff, Info } from 'lucide-react'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'

interface MeliCheckpointModalProps {
  isOpen: boolean
  onClose: () => void
  implantacaoId: string
  nomeEmpresa: string
  /** Chamado após salvar com sucesso, para a tela recarregar as etapas. */
  onSuccess: () => void
}

/**
 * Checkpoint do selo MELI (Mercado Livre).
 * Formulário simples com dois campos: Client ID e Client Secret.
 * Quando ambos preenchidos, a etapa 'Mercado Livre' fica OK (verde).
 */
export function MeliCheckpointModal({
  isOpen,
  onClose,
  implantacaoId,
  nomeEmpresa,
  onSuccess
}: MeliCheckpointModalProps) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const readOnly = isReadOnlyUser()

  useEffect(() => {
    if (isOpen && implantacaoId) {
      setErro('')
      setShowSecret(false)
      carregar()
    }
  }, [isOpen, implantacaoId])

  const carregar = async () => {
    setLoading(true)
    try {
      const dados = await api.getMeliCheckpoint(implantacaoId)
      setClientId(dados?.client_id || '')
      setClientSecret(dados?.client_secret || '')
    } catch (err) {
      console.error('Erro ao carregar checkpoint MELI:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    setErro('')
    if (!clientId.trim() || !clientSecret.trim()) {
      setErro('Preencha o Client ID e o Client Secret para concluir o checkpoint.')
      return
    }
    setSaving(true)
    try {
      await api.saveMeliCheckpoint(implantacaoId, {
        client_id: clientId.trim(),
        client_secret: clientSecret.trim()
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar checkpoint MELI:', err)
      setErro('Erro ao salvar: ' + (err?.message || 'Falha na requisição'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (amarelo = identidade MELI) */}
        <div className="p-5 border-b border-slate-800 bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Checkpoint MELI — Mercado Livre</h3>
              <p className="text-xs text-slate-400">{nomeEmpresa}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSalvar} className="p-6 space-y-5">
          {erro && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
              {erro}
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Credenciais da integração com o Mercado Livre. Ao preencher os dois campos, o checkpoint fica concluído (verde).</span>
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-4 text-center">Carregando...</div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Client ID <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 1234567890123456"
                  className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Client Secret <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={readOnly}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3 pr-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all disabled:opacity-70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title={showSecret ? 'Ocultar' : 'Mostrar'}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Checkpoint'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
