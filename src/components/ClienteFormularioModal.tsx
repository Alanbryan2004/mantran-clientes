import React, { useState, useEffect } from 'react'
import { 
  Building, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, 
  HelpCircle, Plus, Rocket, Send, Sparkles, Trash2, Upload, Users, 
  X, AlertCircle, FileText, Check, ShieldCheck, MapPin, Truck,
  KeyRound, Eye, EyeOff, Save, Lock, Download, Clock
} from 'lucide-react'
import { api, checkCheckpointCompleto } from '../lib/api'
import clsx from 'clsx'

interface ClienteFormularioModalProps {
  isOpen: boolean
  onClose?: () => void
  implantacao: any
  onSuccess: () => void
  initialData?: any
}

export interface CnpjItem {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string
  tributacao: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | ''
  rntrc: string
  ja_emitiu_cte: boolean | null
  serie_nao_utilizada: string
}

export interface UsuarioItem {
  id: string
  nome: string
  email: string
  funcao: string
}

export interface PercursoLineHaulItem {
  id: string
  cnpj_hub_shopee: string
  cidade_origem: string
  uf_origem: string
  cnpj_recebedor: string
  endereco_destino: string
}

export interface CstConfigData {
  habilitar_cst: boolean | null
  cst_por_processo: Record<string, string>
  arquivo_aditivo_nome: string
  arquivo_aditivo_base64: string
  arquivo_aditivo_tamanho?: number
}

export interface CheckpointFormData {
  cnpjs: CnpjItem[]
  processos_shopee: string[]
  percursos_line_haul: PercursoLineHaulItem[]
  percurso_line_haul?: any
  usuarios: UsuarioItem[]
  nfse: {
    emitira_nfse: boolean | null
    inscricao_municipal: string
    codigo_tributacao: string
    codigo_servico: string
    cnae: string
    aliquota_iss: string
    emitia_rps: boolean | null
    nome_municipio: string
    cnpj_emissao: string
  }
  certificado_digital: {
    arquivo_nome: string
    arquivo_base64: string
    arquivo_tamanho?: number
    senha: string
  }
  tabela_frete: {
    arquivo_nome: string
    arquivo_base64: string
    arquivo_tipo: string
    arquivo_tamanho?: number
    observacoes: string
  }
  cst_config: CstConfigData
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function ClienteFormularioModal({ isOpen, onClose, implantacao, onSuccess, initialData }: ClienteFormularioModalProps) {
  const isShopee = implantacao?.tipo_cliente === 'SHOPEE'

  const [currentSlide, setCurrentSlide] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showCertSenha, setShowCertSenha] = useState(false)

  // Form State Initializer
  const [formData, setFormData] = useState<CheckpointFormData>({
    cnpjs: [
      {
        id: '1',
        cnpj: '',
        razao_social: implantacao?.nome_empresa || '',
        nome_fantasia: implantacao?.nome_empresa || '',
        tributacao: '',
        rntrc: '',
        ja_emitiu_cte: null,
        serie_nao_utilizada: ''
      }
    ],
    processos_shopee: implantacao?.operacoes_shopee || ['Last Mile'],
    percursos_line_haul: [
      {
        id: '1',
        cnpj_hub_shopee: '',
        cidade_origem: '',
        uf_origem: 'SP',
        cnpj_recebedor: '',
        endereco_destino: ''
      }
    ],
    usuarios: [
      { id: '1', nome: '', email: '', funcao: 'Operador' }
    ],
    nfse: {
      emitira_nfse: null,
      inscricao_municipal: '',
      codigo_tributacao: '',
      codigo_servico: '',
      cnae: '',
      aliquota_iss: '',
      emitia_rps: null,
      nome_municipio: '',
      cnpj_emissao: ''
    },
    certificado_digital: {
      arquivo_nome: '',
      arquivo_base64: '',
      senha: ''
    },
    tabela_frete: {
      arquivo_nome: '',
      arquivo_base64: '',
      arquivo_tipo: '',
      observacoes: ''
    },
    cst_config: {
      habilitar_cst: null,
      cst_por_processo: {},
      arquivo_aditivo_nome: '',
      arquivo_aditivo_base64: ''
    }
  })

  useEffect(() => {
    if (isOpen && implantacao) {
      const loadData = (dataObj: any) => {
        if (!dataObj) return
        let percursos = dataObj.percursos_line_haul
        if ((!percursos || percursos.length === 0) && dataObj.percurso_line_haul) {
          percursos = [{ id: '1', ...dataObj.percurso_line_haul }]
        }
        setFormData(prev => ({
          ...prev,
          ...dataObj,
          percursos_line_haul: percursos && percursos.length > 0 ? percursos : prev.percursos_line_haul,
          cst_config: dataObj.cst_config ? {
            ...prev.cst_config,
            ...dataObj.cst_config,
            cst_por_processo: dataObj.cst_config.cst_por_processo || {}
          } : prev.cst_config
        }))
      }

      if (initialData?.dados) {
        loadData(initialData.dados)
      } else {
        api.getImplantacaoCheckpoint(implantacao.id).then(cp => {
          if (cp?.dados) {
            loadData(cp.dados)
          }
        }).catch(console.error)
      }
    }
  }, [isOpen, implantacao, initialData])

  if (!isOpen || !implantacao) return null

  // Dynamic list of slides based on whether Line Haul is selected
  const hasLineHaul = formData.processos_shopee.includes('Line Haul')

  const slides = [
    { id: 'welcome', title: 'Boas-Vindas' },
    { id: 'cnpjs', title: '1. CNPJs para CTe e Manifesto' },
    { id: 'tributacao', title: '2. Tributação por CNPJ' },
    ...(isShopee ? [{ id: 'shopee_processos', title: '3. Processos Shopee' }] : []),
    ...(isShopee && hasLineHaul ? [{ id: 'line_haul', title: '4. Percurso do Line Haul' }] : []),
    { id: 'rntrc', title: '5. RNTRC / ANTT' },
    { id: 'cte_anterior', title: '6. Emissão Anterior CTe' },
    { id: 'usuarios', title: '7. Usuários do Sistema' },
    { id: 'nfse', title: '8. Emissão de NFSe' },
    { id: 'certificado', title: '9. Certificado Digital (.pfx)' },
    { id: 'tabela_frete', title: '10. Tabela de Frete' },
    { id: 'cst_aditivo', title: '11. CST por Processo & Aditivo' },
    { id: 'conclusao', title: 'Conclusão e Envio' }
  ]

  const totalSlides = slides.length
  const currentSlideObj = slides[currentSlide] || slides[0]

  // CNPJ helpers
  const handleAddCnpj = () => {
    setFormData(prev => ({
      ...prev,
      cnpjs: [
        ...prev.cnpjs,
        {
          id: String(Date.now()),
          cnpj: '',
          razao_social: '',
          nome_fantasia: '',
          tributacao: '',
          rntrc: '',
          ja_emitiu_cte: null,
          serie_nao_utilizada: ''
        }
      ]
    }))
  }

  const handleRemoveCnpj = (index: number) => {
    if (formData.cnpjs.length <= 1) return
    setFormData(prev => ({
      ...prev,
      cnpjs: prev.cnpjs.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateCnpj = (index: number, field: keyof CnpjItem, value: any) => {
    setFormData(prev => {
      const updated = [...prev.cnpjs]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, cnpjs: updated }
    })
  }

  // Percursos Line Haul helpers
  const handleAddPercursoLineHaul = () => {
    setFormData(prev => ({
      ...prev,
      percursos_line_haul: [
        ...prev.percursos_line_haul,
        {
          id: String(Date.now()),
          cnpj_hub_shopee: '',
          cidade_origem: '',
          uf_origem: 'SP',
          cnpj_recebedor: '',
          endereco_destino: ''
        }
      ]
    }))
  }

  const handleRemovePercursoLineHaul = (index: number) => {
    if (formData.percursos_line_haul.length <= 1) return
    setFormData(prev => ({
      ...prev,
      percursos_line_haul: prev.percursos_line_haul.filter((_, i) => i !== index)
    }))
  }

  const handleUpdatePercursoLineHaul = (index: number, field: keyof PercursoLineHaulItem, value: any) => {
    setFormData(prev => {
      const updated = [...prev.percursos_line_haul]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, percursos_line_haul: updated }
    })
  }

  // Usuario helpers
  const handleAddUsuario = () => {
    setFormData(prev => ({
      ...prev,
      usuarios: [
        ...prev.usuarios,
        { id: String(Date.now()), nome: '', email: '', funcao: 'Operador' }
      ]
    }))
  }

  const handleRemoveUsuario = (index: number) => {
    if (formData.usuarios.length <= 1) return
    setFormData(prev => ({
      ...prev,
      usuarios: prev.usuarios.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateUsuario = (index: number, field: keyof UsuarioItem, value: string) => {
    setFormData(prev => {
      const updated = [...prev.usuarios]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, usuarios: updated }
    })
  }

  // File Upload helpers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo selecionado é muito grande. O limite é de 15MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setFormData(prev => ({
        ...prev,
        tabela_frete: {
          ...prev.tabela_frete,
          arquivo_nome: file.name,
          arquivo_base64: base64,
          arquivo_tipo: file.type || 'application/octet-stream',
          arquivo_tamanho: file.size
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleCertificadoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('O arquivo de certificado é muito grande. O limite é de 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setFormData(prev => ({
        ...prev,
        certificado_digital: {
          ...prev.certificado_digital,
          arquivo_nome: file.name,
          arquivo_base64: base64,
          arquivo_tamanho: file.size
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleAditivoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo de aditivo é muito grande. O limite é de 15MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setFormData(prev => ({
        ...prev,
        cst_config: {
          ...prev.cst_config,
          arquivo_aditivo_nome: file.name,
          arquivo_aditivo_base64: base64,
          arquivo_aditivo_tamanho: file.size
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  // Livre navegação: o usuário pode avançar livremente mesmo sem ter respondido tudo no momento
  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      await api.saveImplantacaoCheckpoint(
        implantacao.id, 
        formData, 
        'Cliente',
        false
      )
      alert('Progresso salvo com sucesso! Você pode continuar preenchendo agora ou depois.')
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar rascunho:', err)
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { isCompleto, pendencias } = checkCheckpointCompleto(formData, isShopee)
      await api.saveImplantacaoCheckpoint(
        implantacao.id, 
        formData, 
        'Cliente',
        true
      )
      if (isCompleto) {
        alert('Parabéns! Todos os dados e arquivos foram enviados. Seu Checkpoint foi 100% concluído!')
      } else {
        alert(`Respostas salvas com sucesso!\n\nNota: Seu Checkpoint permanecerá como PENDENTE pois ainda faltam itens (${pendencias.join(', ')}). Você poderá complementar a qualquer momento.`)
      }
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar formulário de checkpoint:', err)
      alert('Erro ao enviar formulário: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#111420] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl min-h-[580px] flex flex-col overflow-hidden relative text-white">
        
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-800/80 h-2">
          <div 
            className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-2 transition-all duration-500 rounded-r"
            style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
          ></div>
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <img 
              src="/Logo_Mantran_Branco.png" 
              onError={(e) => { e.currentTarget.src = '/Logo_Mantran.png' }}
              alt="Mantran" 
              className="h-7 w-auto object-contain"
            />
            <div className="h-5 w-px bg-slate-700 hidden sm:block"></div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                Formulário de Onboarding & Parametrização
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px] sm:max-w-md">
                {implantacao.nome_empresa}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Salvar progresso para continuar depois"
            >
              <Save className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">{savingDraft ? 'Salvando...' : 'Salvar Progresso'}</span>
            </button>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              Etapa {currentSlide + 1} de {totalSlides}
            </span>

            {onClose && (
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Slide Area */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          
          {/* SLIDE 0: BOAS-VINDAS */}
          {currentSlideObj.id === 'welcome' && (
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto my-auto space-y-6 py-4 animate-fadeIn">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                  Bem-vindo à Mantran Tecnologias
                </span>
                <h1 className="text-3xl font-extrabold text-white mt-3 mb-2">
                  Início da Implantação de {implantacao.nome_empresa}
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-2">
                  Ficamos felizes em tê-lo conosco! Para configurarmos sua base, parâmetros fiscais, 
                  integrações com a Shopee e tabelas operacionais com precisão, precisamos de alguns dados essenciais.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  💡 <em>Você pode navegar livremente e salvar o que tiver em mãos para continuar quando desejar.</em>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2">
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Segurança Total</p>
                  <p className="text-[11px] text-slate-400">Seus dados fiscais e operacionais protegidos em ambiente seguro.</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Preenchimento Flexível</p>
                  <p className="text-[11px] text-slate-400">Avance e salve mesmo se faltar algum dado no momento.</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                  <Truck className="w-5 h-5 text-brand-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Start Imediato</p>
                  <p className="text-[11px] text-slate-400">Nossa equipe inicia a configuração da sua base assim que enviado.</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: CNPJs PARA CTE E MANIFESTO */}
          {currentSlideObj.id === 'cnpjs' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Building className="w-4 h-4" /> Pergunta 1 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Quantos CNPJs irão Emitir CTe e Manifesto (MDF-e)?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Adicione e informe os dados de cada filial/empresa que emitirá documentos fiscais pelo Mantran.
                </p>
              </div>

              <div className="space-y-4">
                {formData.cnpjs.map((cnpjItem, index) => (
                  <div 
                    key={cnpjItem.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 relative group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30">
                        CNPJ #{index + 1}
                      </span>
                      {formData.cnpjs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCnpj(index)}
                          className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Remover CNPJ</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CNPJ
                        </label>
                        <input
                          type="text"
                          placeholder="00.000.000/0000-00"
                          value={cnpjItem.cnpj}
                          onChange={(e) => handleUpdateCnpj(index, 'cnpj', formatCNPJ(e.target.value))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Razão Social
                        </label>
                        <input
                          type="text"
                          placeholder="Nome da Empresa Ltda"
                          value={cnpjItem.razao_social}
                          onChange={(e) => handleUpdateCnpj(index, 'razao_social', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Nome Fantasia
                        </label>
                        <input
                          type="text"
                          placeholder="Nome Fantasia"
                          value={cnpjItem.nome_fantasia}
                          onChange={(e) => handleUpdateCnpj(index, 'nome_fantasia', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddCnpj}
                className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-brand-500 bg-slate-900/30 hover:bg-brand-500/10 text-slate-300 hover:text-brand-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Mais um CNPJ Emissor</span>
              </button>
            </div>
          )}

          {/* SLIDE 2: TRIBUTAÇÃO */}
          {currentSlideObj.id === 'tributacao' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <FileText className="w-4 h-4" /> Pergunta 2 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Informe a Tributação de cada CNPJ
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Selecione o regime tributário de cada empresa para cálculo automático de ICMS/ISS.
                </p>
              </div>

              <div className="space-y-4">
                {formData.cnpjs.map((c, index) => (
                  <div key={c.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-white">
                        {c.razao_social || `CNPJ #${index + 1}`} ({c.cnpj || 'Sem CNPJ informado'})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['Simples Nacional', 'Lucro Presumido', 'Lucro Real'] as const).map((regime) => {
                        const isSelected = c.tributacao === regime
                        return (
                          <button
                            key={regime}
                            type="button"
                            onClick={() => handleUpdateCnpj(index, 'tributacao', regime)}
                            className={clsx(
                              "p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                              isSelected 
                                ? "border-brand-500 bg-brand-500/15 text-white shadow-lg shadow-brand-500/10" 
                                : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            )}
                          >
                            <span className="text-xs font-bold">{regime}</span>
                            <div className={clsx(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                              isSelected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-600"
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 3: PROCESSOS SHOPEE */}
          {currentSlideObj.id === 'shopee_processos' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Truck className="w-4 h-4" /> Pergunta 3 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Quais Processos irá transportar para a Shopee?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Você pode selecionar mais de uma operação. As etapas e rotinas serão parametrizadas automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { id: 'Line Haul', desc: 'Transferência entre hubs e centros de distribuição interestaduais/intermunicipais.' },
                  { id: 'Mobile Hub', desc: 'Operação de coleta/distribuição móvel via aplicação e leitor de carga.' },
                  { id: 'Last Mile', desc: 'Entrega final ao destinatário (consumidor Shopee).' },
                  { id: 'First Mile', desc: 'Primeira milha / Coleta nos sellers e remetentes.' }
                ].map((item) => {
                  const isChecked = formData.processos_shopee.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setFormData(prev => {
                          const current = prev.processos_shopee
                          const updated = isChecked 
                            ? current.filter(x => x !== item.id)
                            : [...current, item.id]
                          return { ...prev, processos_shopee: updated }
                        })
                      }}
                      className={clsx(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between",
                        isChecked 
                          ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10" 
                          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={clsx("font-extrabold text-sm", isChecked ? "text-orange-400" : "text-white")}>
                          {item.id}
                        </span>
                        <div className={clsx(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          isChecked ? "bg-orange-500 border-orange-500 text-white" : "border-slate-600 bg-slate-800"
                        )}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  )
                })}
              </div>

              {formData.processos_shopee.includes('Line Haul') && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Como você selecionou <strong>Line Haul</strong>, a próxima etapa solicitará os dados do percurso.</span>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 4: PERCURSO LINE HAUL */}
          {currentSlideObj.id === 'line_haul' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <MapPin className="w-4 h-4" /> Pergunta 4 de 10 (Exclusivo Line Haul)
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Informe os Percursos do Line Haul
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Dados de origem (HUB Shopee), Cidade/UF e destino de cada linha ou rota de transferência.
                </p>
              </div>

              <div className="space-y-4">
                {formData.percursos_line_haul.map((percurso, index) => (
                  <div key={percurso.id || index} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 relative group">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                        Percurso #{index + 1}
                      </span>
                      {formData.percursos_line_haul.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePercursoLineHaul(index)}
                          className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Remover Percurso</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CNPJ HUB Shopee (Origem do Frete)
                        </label>
                        <input
                          type="text"
                          placeholder="00.000.000/0000-00"
                          value={percurso.cnpj_hub_shopee}
                          onChange={(e) => handleUpdatePercursoLineHaul(index, 'cnpj_hub_shopee', formatCNPJ(e.target.value))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Cidade de Origem
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: São Paulo"
                          value={percurso.cidade_origem}
                          onChange={(e) => handleUpdatePercursoLineHaul(index, 'cidade_origem', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          UF da Origem
                        </label>
                        <select
                          value={percurso.uf_origem || 'SP'}
                          onChange={(e) => handleUpdatePercursoLineHaul(index, 'uf_origem', e.target.value)}
                          className="input-field text-sm"
                        >
                          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          CNPJ Recebedor (Transportadora/Hub)
                        </label>
                        <input
                          type="text"
                          placeholder="00.000.000/0000-00"
                          value={percurso.cnpj_recebedor}
                          onChange={(e) => handleUpdatePercursoLineHaul(index, 'cnpj_recebedor', formatCNPJ(e.target.value))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Endereço de Destino
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Av. das Nações, 1000 - Galpão 3 - Curitiba/PR"
                          value={percurso.endereco_destino}
                          onChange={(e) => handleUpdatePercursoLineHaul(index, 'endereco_destino', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPercursoLineHaul}
                className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-orange-500 bg-slate-900/30 hover:bg-orange-500/10 text-slate-300 hover:text-orange-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Mais 1 Percurso do Line Haul</span>
              </button>
            </div>
          )}

          {/* SLIDE 5: RNTRC / ANTT */}
          {currentSlideObj.id === 'rntrc' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" /> Pergunta 5 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Informe o RNTRC / ANTT de cada CNPJ
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Número do Registro Nacional de Transportadores Rodoviários de Cargas para validação do CTe.
                </p>
              </div>

              <div className="space-y-3.5">
                {formData.cnpjs.map((c, index) => (
                  <div key={c.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        {c.razao_social || `CNPJ #${index + 1}`}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.cnpj || 'Sem CNPJ'}</p>
                    </div>

                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Ex: 12345678"
                        value={c.rntrc}
                        onChange={(e) => handleUpdateCnpj(index, 'rntrc', e.target.value.replace(/\D/g, ''))}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 6: EMISSÃO ANTERIOR CTE / MDF-E */}
          {currentSlideObj.id === 'cte_anterior' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <HelpCircle className="w-4 h-4" /> Pergunta 6 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Já Emitiu CTe ou Manifesto antes neste CNPJ?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Caso já tenha emitido em outro sistema, precisamos de uma série não utilizada para não haver duplicidade na SEFAZ.
                </p>
              </div>

              <div className="space-y-4">
                {formData.cnpjs.map((c, index) => (
                  <div key={c.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">
                        {c.razao_social || `CNPJ #${index + 1}`} ({c.cnpj || 'Sem CNPJ'})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateCnpj(index, 'ja_emitiu_cte', false)}
                        className={clsx(
                          "p-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer",
                          c.ja_emitiu_cte === false 
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" 
                            : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        Não, nunca emitiu
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateCnpj(index, 'ja_emitiu_cte', true)}
                        className={clsx(
                          "p-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer",
                          c.ja_emitiu_cte === true 
                            ? "border-amber-500 bg-amber-500/20 text-amber-300" 
                            : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        Sim, já emitiu
                      </button>
                    </div>

                    {c.ja_emitiu_cte === true && (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          Informe uma Série de CTe / Manifesto que ainda NÃO foi utilizada:
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Série 2 ou Série 10"
                          value={c.serie_nao_utilizada}
                          onChange={(e) => handleUpdateCnpj(index, 'serie_nao_utilizada', e.target.value)}
                          className="input-field text-sm border-amber-500/50 focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 7: USUÁRIOS DO SISTEMA */}
          {currentSlideObj.id === 'usuarios' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Users className="w-4 h-4" /> Pergunta 7 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Informe os Usuários que irão utilizar o Sistema
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Cadastre os colaboradores da sua equipe para criação dos acessos individuais.
                </p>
              </div>

              <div className="space-y-3">
                {formData.usuarios.map((u, index) => (
                  <div key={u.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:flex-1">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        placeholder="Ex: João da Silva"
                        value={u.nome}
                        onChange={(e) => handleUpdateUsuario(index, 'nome', e.target.value)}
                        className="input-field text-xs sm:text-sm"
                      />
                    </div>

                    <div className="w-full sm:w-48">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Função / Setor</label>
                      <input
                        type="text"
                        placeholder="Ex: Faturamento / Operador"
                        value={u.funcao}
                        onChange={(e) => handleUpdateUsuario(index, 'funcao', e.target.value)}
                        className="input-field text-xs sm:text-sm"
                      />
                    </div>

                    <div className="w-full sm:w-48">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email (Opcional)</label>
                      <input
                        type="email"
                        placeholder="joao@empresa.com"
                        value={u.email}
                        onChange={(e) => handleUpdateUsuario(index, 'email', e.target.value)}
                        className="input-field text-xs sm:text-sm"
                      />
                    </div>

                    {formData.usuarios.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUsuario(index)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors self-end sm:self-center mt-3 sm:mt-4"
                        title="Remover Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddUsuario}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-brand-500 bg-slate-900/30 hover:bg-brand-500/10 text-slate-300 hover:text-brand-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Outro Usuário</span>
              </button>
            </div>
          )}

          {/* SLIDE 8: EMISSÃO DE NFSE */}
          {currentSlideObj.id === 'nfse' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <FileSpreadsheet className="w-4 h-4" /> Pergunta 8 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Irá Emitir NFSe (Nota Fiscal de Serviço)?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Selecione Sim se sua operação envolve emissão de notas de serviço municipais pelo Mantran.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, emitira_nfse: false } }))}
                  className={clsx(
                    "p-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer",
                    formData.nfse.emitira_nfse === false 
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-lg" 
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  )}
                >
                  Não
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, emitira_nfse: true } }))}
                  className={clsx(
                    "p-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer",
                    formData.nfse.emitira_nfse === true 
                      ? "border-brand-500 bg-brand-500/20 text-brand-300 shadow-lg" 
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  )}
                >
                  Sim
                </button>
              </div>

              {formData.nfse.emitira_nfse === true && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                    Parâmetros Fiscais da NFSe
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Inscrição Municipal</label>
                      <input
                        type="text"
                        placeholder="Ex: 123456-7"
                        value={formData.nfse.inscricao_municipal}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, inscricao_municipal: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Município</label>
                      <input
                        type="text"
                        placeholder="Ex: São Paulo / Curitiba"
                        value={formData.nfse.nome_municipio}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, nome_municipio: e.target.value } }))}
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
                        value={formData.nfse.codigo_tributacao}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, codigo_tributacao: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código do Serviço</label>
                      <input
                        type="text"
                        placeholder="Ex: 16.01"
                        value={formData.nfse.codigo_servico}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, codigo_servico: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código CNAE</label>
                      <input
                        type="text"
                        placeholder="Ex: 4930-2/02"
                        value={formData.nfse.cnae}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, cnae: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Alíquota ISS do Município (%)</label>
                      <input
                        type="text"
                        placeholder="Ex: 2.5% ou 5%"
                        value={formData.nfse.aliquota_iss}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, aliquota_iss: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Já emitiu NFSe por RPS (outro sistema)?</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, emitia_rps: false } }))}
                          className={clsx(
                            "py-2 rounded-lg border text-xs font-bold transition-colors",
                            formData.nfse.emitia_rps === false ? "bg-slate-700 text-white border-slate-600" : "border-slate-800 text-slate-400"
                          )}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, emitia_rps: true } }))}
                          className={clsx(
                            "py-2 rounded-lg border text-xs font-bold transition-colors",
                            formData.nfse.emitia_rps === true ? "bg-brand-500/20 text-brand-300 border-brand-500" : "border-slate-800 text-slate-400"
                          )}
                        >
                          Sim
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 9: CERTIFICADO DIGITAL (.PFX) */}
          {currentSlideObj.id === 'certificado' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <KeyRound className="w-4 h-4" /> Pergunta 9 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Importe seu Certificado Digital A1 (.pfx) e informe a Senha
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  O certificado digital A1 é necessário para a emissão e assinatura eletrônica dos seus CTes e MDF-es na SEFAZ.
                </p>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
                {/* Upload do Certificado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Arquivo do Certificado Digital (.pfx / .p12):
                  </label>

                  <input
                    type="file"
                    id="cert-file"
                    accept=".pfx,.p12,application/x-pkcs12"
                    onChange={handleCertificadoUpload}
                    className="hidden"
                  />

                  {formData.certificado_digital.arquivo_nome ? (
                    <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-emerald-500/40">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {formData.certificado_digital.arquivo_nome}
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">
                              Anexado
                            </span>
                          </p>
                          <p className="text-xs text-slate-400">
                            {formData.certificado_digital.arquivo_tamanho 
                              ? `${(formData.certificado_digital.arquivo_tamanho / 1024).toFixed(1)} KB` 
                              : 'Certificado pronto'}
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor="cert-file"
                        className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                      >
                        Substituir Certificado
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="cert-file"
                      className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl p-6 bg-slate-900/40 text-center transition-all cursor-pointer flex flex-col items-center space-y-2 block"
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">Clique para selecionar o certificado (.pfx)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Formatos suportados: .pfx ou .p12 (Certificado A1)</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Senha do Certificado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha do Certificado Digital:
                  </label>
                  <div className="relative">
                    <input
                      type={showCertSenha ? "text" : "password"}
                      placeholder="Informe a senha do certificado A1..."
                      value={formData.certificado_digital.senha}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        certificado_digital: { ...prev.certificado_digital, senha: e.target.value }
                      }))}
                      className="input-field text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCertSenha(!showCertSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showCertSenha ? "Ocultar senha" : "Ver senha"}
                    >
                      {showCertSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    🔒 A senha será utilizada unicamente para instalação e emissão dos documentos fiscais no servidor seguro.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 10: TABELA DE FRETE */}
          {currentSlideObj.id === 'tabela_frete' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Upload className="w-4 h-4" /> Pergunta 10 de 10
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Importar sua Tabela de Frete
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Envie uma imagem (print), documento PDF ou planilha Excel da sua tabela de frete para cadastrarmos.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 bg-slate-900/40 text-center transition-all">
                <input
                  type="file"
                  id="frete-file"
                  accept="image/*,.pdf,.xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {formData.tabela_frete.arquivo_nome ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{formData.tabela_frete.arquivo_nome}</p>
                      <p className="text-xs text-slate-400">
                        {formData.tabela_frete.arquivo_tamanho ? `${(formData.tabela_frete.arquivo_tamanho / 1024).toFixed(1)} KB` : 'Arquivo pronto'}
                      </p>
                    </div>

                    <label 
                      htmlFor="frete-file"
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      Substituir Arquivo
                    </label>
                  </div>
                ) : (
                  <label htmlFor="frete-file" className="cursor-pointer flex flex-col items-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">Clique para selecionar ou arraste o arquivo</p>
                      <p className="text-xs text-slate-500 mt-1">Formatos aceitos: Imagens (PNG, JPG), PDF ou Excel (XLSX, CSV)</p>
                    </div>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações adicionais sobre o frete / regras de cálculo (Opcional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Tabela com pedágio incluso, frete valor de 0.3%, taxa mínima de R$ 50,00..."
                  value={formData.tabela_frete.observacoes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    tabela_frete: { ...prev.tabela_frete, observacoes: e.target.value }
                  }))}
                  className="input-field text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* SLIDE 11: CONFIGURAÇÃO DE CST & ADITIVO */}
          {currentSlideObj.id === 'cst_aditivo' && (() => {
            const shopeeProcessesList = ['Line Haul', 'Last Mile', 'Mobile Hub', 'First Mile']
            const processosCstFiltrados = formData.processos_shopee.filter(p => shopeeProcessesList.includes(p))
            const processosExibidos = processosCstFiltrados.length > 0 ? processosCstFiltrados : ['Last Mile']

            return (
              <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
                <div>
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <FileText className="w-4 h-4" /> Pergunta Final (Configuração Fiscal & Aditivo)
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Deseja Configurar a CST a ser Utilizada nos Processos?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Exibindo apenas os processos selecionados pela sua operação.
                  </p>
                </div>

                {/* Lista dos Processos Selecionados */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium mr-1">Seus processos ativos:</span>
                  {processosExibidos.map((proc) => (
                    <span key={proc} className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      {proc}
                    </span>
                  ))}
                </div>

                {/* Opções SIM / NÃO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      cst_config: { ...prev.cst_config, habilitar_cst: true }
                    }))}
                    className={clsx(
                      "p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer",
                      formData.cst_config.habilitar_cst === true
                        ? "border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                        formData.cst_config.habilitar_cst === true ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                      )}>
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">SIM, desejo configurar</p>
                        <p className="text-xs text-slate-400 mt-0.5">Informar CST personalizada e assinar aditivo</p>
                      </div>
                    </div>
                    <div className={clsx(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2",
                      formData.cst_config.habilitar_cst === true ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-700"
                    )}>
                      {formData.cst_config.habilitar_cst === true && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      cst_config: { ...prev.cst_config, habilitar_cst: false }
                    }))}
                    className={clsx(
                      "p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer",
                      formData.cst_config.habilitar_cst === false
                        ? "border-brand-500 bg-brand-500/15 shadow-lg shadow-brand-500/10 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                        formData.cst_config.habilitar_cst === false ? "bg-brand-500/20 text-brand-400" : "bg-slate-800 text-slate-400"
                      )}>
                        <X className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">NÃO, manter padrão</p>
                        <p className="text-xs text-slate-400 mt-0.5">Utilizar regras padrão do sistema</p>
                      </div>
                    </div>
                    <div className={clsx(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2",
                      formData.cst_config.habilitar_cst === false ? "border-brand-500 bg-brand-500 text-white" : "border-slate-700"
                    )}>
                      {formData.cst_config.habilitar_cst === false && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                </div>

                {/* Conteúdo exibido se o usuário escolheu SIM */}
                {formData.cst_config.habilitar_cst === true && (
                  <div className="space-y-5 pt-2 animate-fadeIn">
                    
                    {/* 1. Código CST por Processo */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3">
                        <Truck className="w-4 h-4 text-orange-400" />
                        <span>Informe o Código CST (2 Dígitos) de cada Processo</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {processosExibidos.map((processo) => (
                          <div key={processo} className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wide block">
                                {processo}
                              </span>
                              <span className="text-[11px] text-slate-400">Código CST</span>
                            </div>
                            <div className="w-24 shrink-0">
                              <input
                                type="text"
                                maxLength={2}
                                placeholder="00"
                                value={formData.cst_config.cst_por_processo[processo] || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                                  setFormData(prev => ({
                                    ...prev,
                                    cst_config: {
                                      ...prev.cst_config,
                                      cst_por_processo: {
                                        ...prev.cst_config.cst_por_processo,
                                        [processo]: val
                                      }
                                    }
                                  }))
                                }}
                                className="input-field text-center font-mono font-extrabold text-base py-1.5 uppercase tracking-wider"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Download do Aditivo em PDF & Instrução GOV */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-brand-950/40 border border-brand-500/30 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">
                            Download e Assinatura do Aditivo Contratual
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Para ativar este parâmetro, baixe o documento PDF abaixo, realize a assinatura (<strong>pode ser assinado digitalmente pelo GOV.BR</strong>) e anexe o arquivo assinado.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <a
                          href="/AditivoMantran.pdf"
                          download="AditivoMantran.pdf"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar Documento do Aditivo (PDF)</span>
                        </a>
                      </div>
                    </div>

                    {/* 3. Upload do Aditivo Assinado */}
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 bg-slate-900/50 text-center transition-all">
                      <input
                        type="file"
                        id="aditivo-file"
                        accept=".pdf"
                        onChange={handleAditivoUpload}
                        className="hidden"
                      />

                      {formData.cst_config.arquivo_aditivo_nome ? (
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                              <span>{formData.cst_config.arquivo_aditivo_nome}</span>
                            </p>
                            <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                              ✓ Aditivo assinado anexado com sucesso {formData.cst_config.arquivo_aditivo_tamanho ? `(${(formData.cst_config.arquivo_aditivo_tamanho / 1024).toFixed(1)} KB)` : ''}
                            </p>
                          </div>

                          <label
                            htmlFor="aditivo-file"
                            className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                          >
                            Substituir Aditivo Anexado
                          </label>
                        </div>
                      ) : (
                        <label htmlFor="aditivo-file" className="cursor-pointer flex flex-col items-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">Anexar Aditivo Assinado (.pdf)</p>
                            <p className="text-xs text-slate-500 mt-0.5">Clique para enviar o arquivo assinado pelo GOV.BR ou certificado digital</p>
                          </div>
                        </label>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })()}

          {/* SLIDE 12: CONCLUSÃO E ENVIO */}
          {currentSlideObj.id === 'conclusao' && (() => {
            const { isCompleto, pendencias } = checkCheckpointCompleto(formData, isShopee)

            return (
              <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn py-2">
                <div className="text-center">
                  <div className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3",
                    isCompleto ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {isCompleto ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    {isCompleto ? "Tudo Pronto e 100% Preenchido!" : "Resumo das Informações Preenchidas"}
                  </h3>
                  <p className="text-sm text-slate-300 max-w-lg mx-auto mt-1">
                    {isCompleto 
                      ? "Todas as informações e arquivos foram preenchidos. Ao salvar, seu Checkpoint será concluído com sucesso." 
                      : "Seus dados informados serão salvos com segurança, mas o Checkpoint permanecerá como PENDENTE até que todas as informações e arquivos sejam fornecidos."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <p className="font-bold text-brand-400 uppercase text-[11px]">CNPJs e Tributação</p>
                    <p className="text-slate-300"><strong>Total de CNPJs:</strong> {formData.cnpjs.length}</p>
                    <ul className="list-disc list-inside text-slate-400 space-y-1">
                      {formData.cnpjs.map((c, i) => (
                        <li key={c.id} className="truncate">
                          {c.razao_social || `CNPJ #${i + 1}`} ({c.tributacao || 'Não informado'})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <p className="font-bold text-orange-400 uppercase text-[11px]">Operações & Usuários</p>
                    <p className="text-slate-300">
                      <strong>Processos:</strong> {formData.processos_shopee.join(', ') || 'Nenhum'}
                    </p>
                    <p className="text-slate-300">
                      <strong>Usuários:</strong> {formData.usuarios.length}
                    </p>
                    <p className="text-slate-300">
                      <strong>NFSe:</strong> {formData.nfse.emitira_nfse ? 'Sim' : 'Não'}
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <p className="font-bold text-emerald-400 uppercase text-[11px]">Arquivos & Certificado</p>
                    <p className="text-slate-300">
                      <strong>Certificado:</strong> {formData.certificado_digital.arquivo_nome ? '✓ Anexado' : 'Pendente'}
                    </p>
                    <p className="text-slate-300">
                      <strong>Senha Certificado:</strong> {formData.certificado_digital.senha ? '✓ Informada' : 'Pendente'}
                    </p>
                    <p className="text-slate-300">
                      <strong>Tabela Frete:</strong> {formData.tabela_frete.arquivo_nome ? '✓ Anexada' : 'Pendente'}
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <p className="font-bold text-purple-400 uppercase text-[11px]">CST & Aditivo</p>
                    <p className="text-slate-300">
                      <strong>Config. CST:</strong> {formData.cst_config.habilitar_cst === true ? 'Sim' : formData.cst_config.habilitar_cst === false ? 'Padrão' : 'Não definido'}
                    </p>
                    <p className="text-slate-300">
                      <strong>Aditivo:</strong> {formData.cst_config.arquivo_aditivo_nome ? '✓ Anexado' : 'Pendente'}
                    </p>
                  </div>
                </div>

                {isCompleto ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                    <Rocket className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200 leading-relaxed">
                      Ao clicar em <strong>"Finalizar e Concluir Checkpoint"</strong>, sua etapa de <strong>Checkpoint</strong> será concluída como OK e nossa equipe técnica iniciará a preparação da base imediatamente.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Itens pendentes a serem complementados depois ({pendencias.length}):</span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-amber-200/90 list-disc list-inside">
                      {pendencias.map((p, idx) => (
                        <li key={idx}><strong>{p}</strong></li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-amber-500/20">
                      💡 <em>Ao salvar agora, o Checkpoint permanecerá como <strong>PENDENTE</strong>. Você poderá voltar a qualquer momento para anexar o restante e finalizar.</em>
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0 || submitting || savingDraft}
            className={clsx(
              "btn-secondary flex items-center gap-1.5 text-xs sm:text-sm",
              currentSlide === 0 ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          {/* Dots Indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <div
                key={s.id}
                className={clsx(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentSlide 
                    ? "w-6 bg-brand-500" 
                    : idx < currentSlide 
                    ? "w-2 bg-emerald-500/60" 
                    : "w-2 bg-slate-700"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentSlide < totalSlides - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting || savingDraft}
                className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (() => {
              const { isCompleto } = checkCheckpointCompleto(formData, isShopee)
              return (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || savingDraft}
                  className={clsx(
                    "text-white font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer",
                    isCompleto
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                      : "bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 shadow-brand-500/20"
                  )}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting 
                      ? 'Salvando...' 
                      : isCompleto 
                      ? 'Finalizar e Concluir Checkpoint' 
                      : 'Salvar Respostas (Manter Pendente)'}
                  </span>
                </button>
              )
            })()}
          </div>
        </div>

      </div>
    </div>
  )
}
