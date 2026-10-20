import { useState, useEffect } from 'react'
import { X, FileText, Save, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'
import type { NfseItem } from './ClienteFormularioModal'

interface NfseCheckpointModalProps {
  isOpen: boolean
  onClose: () => void
  implantacaoId: string
  nomeEmpresa: string
  onSuccess: () => void
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const novoParametro = (): NfseItem => ({
  id: String(Date.now()),
  cnpj_emissao: '',
  inscricao_municipal: '',
  nome_municipio: '',
  codigo_tributacao: '',
  codigo_servico: '',
  cnae: '',
  aliquota_iss: '',
  codigo_nbs: '',
  emitia_rps: null
})

/**
 * Checkpoint ENXUTO da NFSe para implantações dedicadas de NFSE.
 * Mostra apenas a parte de NFSe (pergunta 8), com a resposta "Sim" fixa,
 * e os parâmetros fiscais. Não é o questionário completo.
 */
export function NfseCheckpointModal({
  isOpen,
  onClose,
  implantacaoId,
  nomeEmpresa,
  onSuccess
}: NfseCheckpointModalProps) {
  const [parametros, setParametros] = useState<NfseItem[]>([novoParametro()])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const readOnly = isReadOnlyUser()

  useEffect(() => {
    if (isOpen && implantacaoId) {
      setErro('')
      carregar()
    }
  }, [isOpen, implantacaoId])

  const carregar = async () => {
    setLoading(true)
    try {
      const nfse = await api.getNfseCheckpoint(implantacaoId)
      const lista = Array.isArray(nfse?.parametros) && nfse.parametros.length > 0
        ? nfse.parametros
        : [novoParametro()]
      setParametros(lista)
    } catch (err) {
      console.error('Erro ao carregar checkpoint NFSe:', err)
      setParametros([novoParametro()])
    } finally {
      setLoading(false)
    }
  }

  const atualizar = (index: number, campo: keyof NfseItem, valor: any) => {
    setParametros(prev => {
      const copia = [...prev]
      copia[index] = { ...copia[index], [campo]: valor }
      return copia
    })
  }

  const adicionar = () => setParametros(prev => [...prev, novoParametro()])
  const remover = (index: number) => setParametros(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index))

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    setErro('')
    const algumValido = parametros.some(p => (p.inscricao_municipal || '').trim() && (p.nome_municipio || '').trim())
    if (!algumValido) {
      setErro('Informe ao menos a Inscrição Municipal e o Município de um cadastro de NFSe.')
      return
    }
    setSaving(true)
    try {
      await api.saveNfseCheckpoint(implantacaoId, parametros)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar checkpoint NFSe:', err)
      setErro('Erro ao salvar: ' + (err?.message || 'Falha na requisição'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-brand-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-brand-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Checkpoint NFSe — Nota Fiscal de Serviço</h3>
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
        <form onSubmit={handleSalvar} className="p-6 space-y-4 overflow-y-auto flex-1">
          {erro && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
              {erro}
            </div>
          )}

          {/* Pergunta fixa como "Sim" */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <span className="font-bold">Irá Emitir NFSe?</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 font-bold">Sim</span>
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Carregando...</div>
          ) : (
            <>
              {parametros.map((n, index) => (
                <div key={n.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                      Parâmetros Fiscais da NFSe {parametros.length > 1 ? `#${index + 1}` : ''}
                    </h4>
                    {parametros.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remover(index)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remover este cadastro de NFSe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ</label>
                      <input
                        type="text"
                        placeholder="Ex: 00.000.000/0000-00"
                        value={n.cnpj_emissao || ''}
                        onChange={(e) => atualizar(index, 'cnpj_emissao', formatCNPJ(e.target.value))}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Inscrição Municipal</label>
                      <input
                        type="text"
                        placeholder="Ex: 123456-7"
                        value={n.inscricao_municipal}
                        onChange={(e) => atualizar(index, 'inscricao_municipal', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Município</label>
                      <input
                        type="text"
                        placeholder="Ex: São Paulo / Curitiba"
                        value={n.nome_municipio}
                        onChange={(e) => atualizar(index, 'nome_municipio', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código de Tributação</label>
                      <input
                        type="text"
                        placeholder="Ex: 01.01"
                        value={n.codigo_tributacao}
                        onChange={(e) => atualizar(index, 'codigo_tributacao', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código do Serviço</label>
                      <input
                        type="text"
                        placeholder="Ex: 16.01"
                        value={n.codigo_servico}
                        onChange={(e) => atualizar(index, 'codigo_servico', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código CNAE</label>
                      <input
                        type="text"
                        placeholder="Ex: 4930-2/02"
                        value={n.cnae}
                        onChange={(e) => atualizar(index, 'cnae', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Alíquota ISS do Município (%)</label>
                      <input
                        type="text"
                        placeholder="Ex: 2.5% ou 5%"
                        value={n.aliquota_iss}
                        onChange={(e) => atualizar(index, 'aliquota_iss', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código NBS</label>
                      <input
                        type="text"
                        placeholder="Ex: 1.0101.10.00"
                        value={n.codigo_nbs || ''}
                        onChange={(e) => atualizar(index, 'codigo_nbs', e.target.value)}
                        disabled={readOnly}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Já emitiu NFSe por RPS (outro sistema)?</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => atualizar(index, 'emitia_rps', false)}
                          disabled={readOnly}
                          className={`py-2 rounded-lg border text-xs font-bold transition-colors ${n.emitia_rps === false ? 'bg-slate-700 text-white border-slate-600' : 'border-slate-800 text-slate-400'}`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizar(index, 'emitia_rps', true)}
                          disabled={readOnly}
                          className={`py-2 rounded-lg border text-xs font-bold transition-colors ${n.emitia_rps === true ? 'bg-brand-500/20 text-brand-300 border-brand-500' : 'border-slate-800 text-slate-400'}`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={adicionar}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-brand-500 bg-slate-900/30 hover:bg-brand-500/10 text-slate-300 hover:text-brand-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar outro cadastro de NFSe</span>
                </button>
              )}
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
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 rounded-xl shadow-lg shadow-brand-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Checkpoint NFSe'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
