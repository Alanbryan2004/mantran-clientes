import { useState, useEffect } from 'react'
import { X, FileText, Save, Plus, Trash2, KeyRound, Lock, Eye, EyeOff, Download } from 'lucide-react'
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

interface CertificadoState {
  arquivo_nome: string
  arquivo_base64: string
  arquivo_tamanho?: number
  senha: string
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
 * Checkpoint da NFSe para implantações dedicadas de NFSE.
 * Mostra o Certificado Digital A1 (.pfx) com Senha e os Parâmetros Fiscais da NFSe.
 */
export function NfseCheckpointModal({
  isOpen,
  onClose,
  implantacaoId,
  nomeEmpresa,
  onSuccess
}: NfseCheckpointModalProps) {
  const [parametros, setParametros] = useState<NfseItem[]>([novoParametro()])
  // controla a visibilidade da senha por cadastro (índice -> boolean)
  const [showCertSenha, setShowCertSenha] = useState<Record<number, boolean>>({})
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
      const data = await api.getNfseCheckpoint(implantacaoId)
      let lista: NfseItem[] = Array.isArray(data?.parametros) && data.parametros.length > 0
        ? data.parametros
        : (Array.isArray(data) && data.length > 0 ? data : [novoParametro()])

      // Retrocompatibilidade: se houver um certificado GLOBAL antigo e o 1º cadastro
      // ainda não tiver certificado próprio, migra o global para ele.
      const certGlobal = data?.certificado_digital
      const temCertGlobal = certGlobal && (certGlobal.arquivo_nome || certGlobal.senha)
      if (temCertGlobal && lista[0] && !lista[0].certificado) {
        lista = lista.map((p, i) => i === 0
          ? { ...p, certificado: {
              arquivo_nome: certGlobal.arquivo_nome || '',
              arquivo_base64: certGlobal.arquivo_base64 || '',
              arquivo_tamanho: certGlobal.arquivo_tamanho || 0,
              senha: certGlobal.senha || ''
            } }
          : p)
      }
      setParametros(lista)
    } catch (err) {
      console.error('Erro ao carregar checkpoint NFSe:', err)
      setParametros([novoParametro()])
    } finally {
      setLoading(false)
    }
  }

  const certVazio = (): CertificadoState => ({ arquivo_nome: '', arquivo_base64: '', arquivo_tamanho: 0, senha: '' })

  // Atualiza o certificado de um cadastro específico (por índice).
  const atualizarCert = (index: number, patch: Partial<CertificadoState>) => {
    setParametros(prev => prev.map((p, i) => {
      if (i !== index) return p
      const atual = p.certificado || certVazio()
      return { ...p, certificado: { ...atual, ...patch } }
    }))
  }

  const handleCertificadoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('O arquivo de certificado é muito grande. O limite é de 10MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      atualizarCert(index, { arquivo_nome: file.name, arquivo_base64: reader.result as string, arquivo_tamanho: file.size })
    }
    reader.readAsDataURL(file)
    e.target.value = '' // permite reupload do mesmo arquivo
  }

  const handleRemoverCertificado = (index: number) => atualizarCert(index, certVazio())

  const handleDownloadCertificado = (index: number) => {
    const cert = parametros[index]?.certificado
    if (!cert?.arquivo_base64) return
    const link = document.createElement('a')
    link.href = cert.arquivo_base64
    link.download = cert.arquivo_nome || 'certificado.pfx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

    // Para cada cadastro: se anexou o arquivo do certificado, a senha é obrigatória.
    const idxSemSenha = parametros.findIndex(p => p.certificado?.arquivo_base64 && !(p.certificado?.senha || '').trim())
    if (idxSemSenha >= 0) {
      setErro(`Informe a senha do Certificado Digital do cadastro #${idxSemSenha + 1}.`)
      return
    }

    const algumValido = parametros.some(p => (p.inscricao_municipal || '').trim() && (p.nome_municipio || '').trim())
    if (!algumValido) {
      setErro('Informe ao menos a Inscrição Municipal e o Município de um cadastro de NFSe.')
      return
    }
    setSaving(true)
    try {
      // Mantém o certificado GLOBAL (consumido pelo checklist/visualização) apontando
      // para o certificado do primeiro cadastro que tiver um anexado.
      const primeiroCert = parametros.find(p => p.certificado?.arquivo_nome || (p.certificado?.senha || '').trim())?.certificado
      const certificadoGlobal = primeiroCert || certVazio()
      await api.saveNfseCheckpoint(implantacaoId, parametros, certificadoGlobal)
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
        className="bg-slate-900 border border-brand-500/40 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
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
        <form onSubmit={handleSalvar} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              {/* Cada cadastro de NFSe tem o SEU próprio Certificado Digital A1 + parâmetros */}
              {parametros.map((n, index) => (
                <div key={n.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                      Cadastro de NFSe {parametros.length > 1 ? `#${index + 1}` : ''}
                    </h4>
                    {parametros.length > 1 && !readOnly && (
                      <button
                        type="button"
                        onClick={() => remover(index)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remover este cadastro de NFSe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* CERTIFICADO DIGITAL A1 deste cadastro */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Certificado Digital A1 (.pfx) & Senha</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">Necessário para emissão e assinatura das NFSe deste CNPJ/município.</p>
                      </div>
                    </div>

                    <input
                      type="file"
                      id={`nfse-cert-file-${index}`}
                      accept=".pfx,.p12,application/x-pkcs12"
                      onChange={(e) => handleCertificadoUpload(index, e)}
                      disabled={readOnly}
                      className="hidden"
                    />

                    {n.certificado?.arquivo_nome ? (
                      <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-emerald-500/40 flex-wrap gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{n.certificado.arquivo_nome}</span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase shrink-0">Anexado</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {n.certificado.arquivo_tamanho ? `${(n.certificado.arquivo_tamanho / 1024).toFixed(1)} KB` : 'Certificado pronto'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {n.certificado.arquivo_base64 && (
                            <button type="button" onClick={() => handleDownloadCertificado(index)} className="text-xs py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Baixar certificado">
                              <Download className="w-3.5 h-3.5 text-slate-400" /><span>Baixar</span>
                            </button>
                          )}
                          {!readOnly && (
                            <>
                              <label htmlFor={`nfse-cert-file-${index}`} className="text-xs py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-brand-200 border border-brand-500/40 cursor-pointer transition-colors">Substituir</label>
                              <button type="button" onClick={() => handleRemoverCertificado(index)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer" title="Remover certificado">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      readOnly ? (
                        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-500 italic text-center">Nenhum certificado digital anexado.</div>
                      ) : (
                        <label htmlFor={`nfse-cert-file-${index}`} className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl p-5 bg-slate-900/40 text-center transition-all cursor-pointer flex flex-col items-center space-y-2 block group">
                          <div className="w-11 h-11 rounded-full bg-brand-500/10 group-hover:bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center transition-colors">
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Clique para selecionar o certificado (.pfx)</p>
                            <p className="text-xs text-slate-500 mt-0.5">Formatos suportados: .pfx ou .p12 (Certificado A1)</p>
                          </div>
                        </label>
                      )
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Senha do Certificado Digital:</label>
                      <div className="relative">
                        <input
                          type={showCertSenha[index] ? 'text' : 'password'}
                          placeholder="Informe a senha do certificado A1..."
                          value={n.certificado?.senha || ''}
                          onChange={(e) => atualizarCert(index, { senha: e.target.value })}
                          disabled={readOnly}
                          className="input-field text-sm pr-10"
                        />
                        <button type="button" onClick={() => setShowCertSenha(prev => ({ ...prev, [index]: !prev[index] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer" title={showCertSenha[index] ? 'Ocultar senha' : 'Ver senha'}>
                          {showCertSenha[index] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-1">Parâmetros Fiscais</h5>

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
                          className={`py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${n.emitia_rps === false ? 'bg-slate-700 text-white border-slate-600' : 'border-slate-800 text-slate-400'}`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizar(index, 'emitia_rps', true)}
                          disabled={readOnly}
                          className={`py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${n.emitia_rps === true ? 'bg-brand-500/20 text-brand-300 border-brand-500' : 'border-slate-800 text-slate-400'}`}
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
