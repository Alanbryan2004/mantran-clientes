import { useState } from 'react'
import { 
  Building, CheckCircle2, Download, FileSpreadsheet, 
  FileText, MapPin, Truck, Users, 
  X, Edit3, KeyRound, Lock, Eye, EyeOff, Copy
} from 'lucide-react'
import type { CheckpointFormData } from './ClienteFormularioModal'
import clsx from 'clsx'

interface VisualizarCheckpointModalProps {
  isOpen: boolean
  onClose: () => void
  checkpoint: any
  implantacao: any
  onEdit?: () => void
}

export function VisualizarCheckpointModal({ 
  isOpen, 
  onClose, 
  checkpoint, 
  implantacao,
  onEdit
}: VisualizarCheckpointModalProps) {
  const [activeTab, setActiveTab] = useState<'cnpjs' | 'shopee' | 'usuarios' | 'nfse' | 'certificado' | 'frete' | 'cst_aditivo'>('cnpjs')
  const [showCertSenha, setShowCertSenha] = useState(false)
  const [copiedSenha, setCopiedSenha] = useState(false)

  if (!isOpen || !checkpoint) return null

  const dados: CheckpointFormData = checkpoint.dados || {}
  const cnpjs = dados.cnpjs || []
  const processos = dados.processos_shopee || []
  const percursos = dados.percursos_line_haul || (dados.percurso_line_haul ? [dados.percurso_line_haul] : [])
  const usuarios = dados.usuarios || []
  const nfse = dados.nfse || {}
  const certificado = dados.certificado_digital || { arquivo_nome: '', arquivo_base64: '', senha: '' }
  const frete = dados.tabela_frete || {}
  const cstConfig = dados.cst_config || { habilitar_cst: null, cst_por_processo: {}, arquivo_aditivo_nome: '', arquivo_aditivo_base64: '' }

  const downloadFrete = () => {
    if (!frete.arquivo_base64) return
    const link = document.createElement('a')
    link.href = frete.arquivo_base64
    link.download = frete.arquivo_nome || 'tabela_frete'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadCertificado = () => {
    if (!certificado.arquivo_base64) return
    const link = document.createElement('a')
    link.href = certificado.arquivo_base64
    link.download = certificado.arquivo_nome || 'certificado.pfx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAditivo = () => {
    if (cstConfig.arquivo_aditivo_base64) {
      const link = document.createElement('a')
      link.href = cstConfig.arquivo_aditivo_base64
      link.download = cstConfig.arquivo_aditivo_nome || 'Aditivo_Assinado.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const link = document.createElement('a')
      link.href = '/AditivoMantran.pdf'
      link.download = 'AditivoMantran.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopySenha = () => {
    if (!certificado.senha) return
    navigator.clipboard.writeText(certificado.senha)
    setCopiedSenha(true)
    setTimeout(() => setCopiedSenha(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#111420] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-white">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Dados do Checkpoint</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                  Formulário Respondido
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {implantacao?.nome_empresa} • Enviado em {new Date(checkpoint.created_at || Date.now()).toLocaleDateString('pt-BR')} às {new Date(checkpoint.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-slate-700 hover:border-brand-500 text-slate-300 hover:text-white"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar Respostas</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/30 flex gap-2 overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'cnpjs', label: `CNPJs & Tributação (${cnpjs.length})`, icon: Building },
            { id: 'shopee', label: 'Operações Shopee', icon: Truck },
            { id: 'usuarios', label: `Usuários (${usuarios.length})`, icon: Users },
            { id: 'nfse', label: 'NFSe', icon: FileText },
            { id: 'certificado', label: 'Certificado Digital', icon: KeyRound },
            { id: 'frete', label: 'Tabela de Frete', icon: FileSpreadsheet },
            { id: 'cst_aditivo', label: 'CST & Aditivo', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer",
                  isActive
                    ? "border-brand-500 text-brand-400 bg-brand-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* TAB 1: CNPJs */}
          {activeTab === 'cnpjs' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                CNPJs Emissores de CTe / Manifesto ({cnpjs.length})
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {cnpjs.map((c, i) => (
                  <div key={c.id || i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 mr-2">
                          CNPJ #{i + 1}
                        </span>
                        <span className="text-sm font-bold text-white">{c.razao_social || 'Sem Razão Social'}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-400 bg-slate-800 px-2.5 py-1 rounded">
                        {c.cnpj || 'Não informado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-[11px] mb-0.5">Nome Fantasia</p>
                        <p className="font-semibold text-slate-200">{c.nome_fantasia || 'Não informado'}</p>
                      </div>

                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-[11px] mb-0.5">Regime Tributário</p>
                        <p className="font-bold text-amber-400">{c.tributacao || 'Não informado'}</p>
                      </div>

                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-[11px] mb-0.5">RNTRC / ANTT</p>
                        <p className="font-semibold text-slate-200 font-mono">{c.rntrc || 'Não informado'}</p>
                      </div>

                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-[11px] mb-0.5">Emissão Anterior CTe</p>
                        {c.ja_emitiu_cte ? (
                          <span className="text-amber-300 font-bold">
                            Sim (Série: {c.serie_nao_utilizada || 'N/A'})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Não, 1ª emissão</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SHOPEE */}
          {activeTab === 'shopee' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Processos Selecionados para a Shopee
                </h3>
                <div className="flex flex-wrap gap-2">
                  {processos.length > 0 ? (
                    processos.map((p) => (
                      <span key={p} className="px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 text-xs font-extrabold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-xs">Nenhum processo específico selecionado.</span>
                  )}
                </div>
              </div>

              {processos.includes('Line Haul') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4" /> Percursos do Line Haul ({percursos.length})
                  </div>

                  {percursos.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 italic">
                      Nenhum percurso informado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {percursos.map((percursoItem: any, idx: number) => (
                        <div key={percursoItem.id || idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              Percurso #{idx + 1}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                              <p className="text-slate-400 text-[11px] mb-0.5">CNPJ HUB Shopee (Origem)</p>
                              <p className="font-mono font-bold text-slate-200">{percursoItem.cnpj_hub_shopee || 'Não informado'}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Origem: <strong className="text-white">{percursoItem.cidade_origem ? `${percursoItem.cidade_origem} / ` : ''}{percursoItem.uf_origem || 'SP'}</strong>
                              </p>
                            </div>

                            <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                              <p className="text-slate-400 text-[11px] mb-0.5">CNPJ Recebedor (Destino)</p>
                              <p className="font-mono font-bold text-slate-200">{percursoItem.cnpj_recebedor || 'Não informado'}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Endereço Destino: <strong className="text-white">{percursoItem.endereco_destino || 'Não informado'}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USUÁRIOS */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Colaboradores e Operadores Cadastrados ({usuarios.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {usuarios.map((u, i) => (
                  <div key={u.id || i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      {u.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{u.nome || `Usuário #${i + 1}`}</p>
                      <p className="text-[11px] text-brand-400 font-medium">{u.funcao || 'Operador'}</p>
                      {u.email && <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: NFSE */}
          {activeTab === 'nfse' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Configurações de Nota Fiscal de Serviço (NFSe)
              </h3>

              {nfse.emitira_nfse ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Município de Emissão</p>
                      <p className="font-bold text-slate-200">{nfse.nome_municipio || 'Não informado'}</p>
                    </div>

                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Inscrição Municipal</p>
                      <p className="font-mono font-bold text-slate-200">{nfse.inscricao_municipal || 'Não informado'}</p>
                    </div>

                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Alíquota ISS</p>
                      <p className="font-bold text-emerald-400">{nfse.aliquota_iss || 'Não informado'}</p>
                    </div>

                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Código do Serviço</p>
                      <p className="font-mono font-semibold text-slate-200">{nfse.codigo_servico || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Código de Tributação</p>
                      <p className="font-mono text-slate-200">{nfse.codigo_tributacao || 'Não informado'}</p>
                    </div>

                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">CNAE</p>
                      <p className="font-mono text-slate-200">{nfse.cnae || 'Não informado'}</p>
                    </div>

                    <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <p className="text-slate-400 text-[11px] mb-0.5">Emitia RPS Anteriormente?</p>
                      <p className="font-bold text-slate-200">{nfse.emitia_rps ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-white text-sm mb-1">Não emitirá NFSe</p>
                  <p>O cliente informou que não realizará emissão de Notas Fiscais de Serviço.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CERTIFICADO DIGITAL */}
          {activeTab === 'certificado' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Certificado Digital A1 (.pfx)
              </h3>

              {certificado.arquivo_base64 || certificado.arquivo_nome || certificado.senha ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  {/* Arquivo */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/60">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{certificado.arquivo_nome || 'Certificado Digital .pfx'}</p>
                        <p className="text-xs text-slate-400">
                          {certificado.arquivo_tamanho ? `${(certificado.arquivo_tamanho / 1024).toFixed(1)} KB` : 'Pronto para download'}
                        </p>
                      </div>
                    </div>

                    {certificado.arquivo_base64 && (
                      <button
                        type="button"
                        onClick={downloadCertificado}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Certificado</span>
                      </button>
                    )}
                  </div>

                  {/* Senha */}
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Senha do Certificado Digital:</p>
                      <p className="text-sm font-mono font-bold text-emerald-400">
                        {certificado.senha 
                          ? (showCertSenha ? certificado.senha : '••••••••••••') 
                          : <span className="text-slate-500 italic font-sans font-normal">Não informada</span>}
                      </p>
                    </div>

                    {certificado.senha && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCertSenha(!showCertSenha)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          {showCertSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showCertSenha ? 'Ocultar' : 'Revelar Senha'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopySenha}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedSenha ? 'Copiada!' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                  <KeyRound className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-white text-sm mb-1">Certificado Digital não informado</p>
                  <p>O cliente ainda não anexou o arquivo .pfx ou senha do certificado.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TABELA DE FRETE */}
          {activeTab === 'frete' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tabela de Frete Anexada
              </h3>

              {frete.arquivo_base64 || frete.arquivo_nome ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/60">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{frete.arquivo_nome || 'Arquivo de Tabela de Frete'}</p>
                        <p className="text-xs text-slate-400">
                          {frete.arquivo_tamanho ? `${(frete.arquivo_tamanho / 1024).toFixed(1)} KB` : 'Pronto para download'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={downloadFrete}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Arquivo</span>
                    </button>
                  </div>

                  {frete.observacoes && (
                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Observações do Frete:</p>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{frete.observacoes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-white text-sm mb-1">Nenhum arquivo anexado</p>
                  <p>O cliente não anexou arquivo da tabela de frete neste formulário.</p>
                  {frete.observacoes && (
                    <div className="mt-4 p-3 bg-slate-800/30 rounded-lg text-left max-w-md mx-auto">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Observações:</p>
                      <p className="text-xs text-slate-300">{frete.observacoes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CST & ADITIVO */}
          {activeTab === 'cst_aditivo' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Configuração de CST por Operação & Termo Aditivo
                </h3>
                <span className={clsx(
                  "text-xs font-bold px-2.5 py-1 rounded-full border",
                  cstConfig.habilitar_cst === true 
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" 
                    : cstConfig.habilitar_cst === false
                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {cstConfig.habilitar_cst === true ? 'CST Personalizada Ativada' : cstConfig.habilitar_cst === false ? 'Padrão do Sistema' : 'Não Informado'}
                </span>
              </div>

              {/* Tabela / Cards de CST por Processo */}
              {cstConfig.habilitar_cst === true && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                    <Truck className="w-4 h-4" />
                    <span>CSTs Informadas por Processo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.keys(cstConfig.cst_por_processo || {}).length > 0 ? (
                      Object.entries(cstConfig.cst_por_processo).map(([proc, cstVal]) => (
                        <div key={proc} className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">{proc}</p>
                            <p className="text-[10px] text-slate-400">Código CST</p>
                          </div>
                          <span className="text-sm font-mono font-extrabold px-3 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg">
                            {cstVal || 'N/A'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 col-span-full italic">Nenhum código CST preenchido.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Termo Aditivo Anexado / Download */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Documento do Termo Aditivo</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/60">
                  <div className="flex items-center space-x-3.5">
                    <div className={clsx(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold",
                      cstConfig.arquivo_aditivo_base64 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    )}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {cstConfig.arquivo_aditivo_nome || 'AditivoMantran.pdf (Modelo Original)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cstConfig.arquivo_aditivo_base64 
                          ? `✓ Aditivo assinado pelo cliente (${cstConfig.arquivo_aditivo_tamanho ? (cstConfig.arquivo_aditivo_tamanho / 1024).toFixed(1) + ' KB' : 'PDF'})` 
                          : 'Modelo padrão disponível para download'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={downloadAditivo}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shrink-0 shadow-lg shadow-brand-500/10"
                  >
                    <Download className="w-4 h-4" />
                    <span>{cstConfig.arquivo_aditivo_base64 ? 'Baixar Aditivo Assinado' : 'Baixar Modelo PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
