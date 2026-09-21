import React, { useState } from 'react'
import { 
  Building, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, 
  HelpCircle, Plus, Rocket, Send, Sparkles, Trash2, Upload, Users, 
  X, AlertCircle, FileText, Check, ShieldCheck, MapPin, Truck
} from 'lucide-react'
import { api } from '../lib/api'
import { getLoggedUser } from '../lib/auth'
import clsx from 'clsx'

interface ClienteFormularioModalProps {
  isOpen: boolean
  onClose?: () => void
  implantacao: any
  onSuccess: () => void
  isReadOnly?: boolean
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

export interface CheckpointFormData {
  cnpjs: CnpjItem[]
  processos_shopee: string[]
  percurso_line_haul: {
    cnpj_hub_shopee: string
    cidade_origem: string
    uf_origem: string
    cnpj_recebedor: string
    endereco_destino: string
  }
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
  tabela_frete: {
    arquivo_nome: string
    arquivo_base64: string
    arquivo_tipo: string
    arquivo_tamanho?: number
    observacoes: string
  }
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

export function ClienteFormularioModal({ isOpen, onClose, implantacao, onSuccess }: ClienteFormularioModalProps) {
  const user = getLoggedUser()
  const isShopee = implantacao?.tipo_cliente === 'SHOPEE'

  const [currentSlide, setCurrentSlide] = useState(0)
  const [submitting, setSubmitting] = useState(false)

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
    percurso_line_haul: {
      cnpj_hub_shopee: '',
      cidade_origem: '',
      uf_origem: 'SP',
      cnpj_recebedor: '',
      endereco_destino: ''
    },
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
    tabela_frete: {
      arquivo_nome: '',
      arquivo_base64: '',
      arquivo_tipo: '',
      observacoes: ''
    }
  })

  if (!isOpen || !implantacao) return null

  // Dynamic list of slides based on whether Line Haul is selected
  const hasLineHaul = formData.processos_shopee.includes('Line Haul')

  // Slides configuration
  // 0: Boas-Vindas
  // 1: CNPJs (Pergunta 1)
  // 2: Tributação (Pergunta 2)
  // 3: Processos Shopee (Pergunta 3)
  // 4: Percurso Line Haul (Pergunta 4) - Se selecionou Line Haul
  // 5: RNTRC (Pergunta 5)
  // 6: Emissão Anterior CTe/MDF-e (Pergunta 6)
  // 7: Usuários (Pergunta 7)
  // 8: NFSe (Pergunta 8)
  // 9: Tabela de Frete (Pergunta 9)
  // 10: Conclusão
  const slides = [
    { id: 'welcome', title: 'Boas-Vindas' },
    { id: 'cnpjs', title: '1. CNPJs para CTe e Manifesto' },
    { id: 'tributacao', title: '2. Tributação por CNPJ' },
    ...(isShopee ? [{ id: 'shopee_processos', title: '3. Processos Shopee' }] : []),
    ...(isShopee && hasLineHaul ? [{ id: 'line_haul', title: '4. Percurso do Line Haul' }] : []),
    { id: 'rntrc', title: isShopee && hasLineHaul ? '5. RNTRC / ANTT' : isShopee ? '4. RNTRC / ANTT' : '3. RNTRC / ANTT' },
    { id: 'cte_anterior', title: 'Emissão Anterior CTe' },
    { id: 'usuarios', title: 'Usuários do Sistema' },
    { id: 'nfse', title: 'Emissão de NFSe' },
    { id: 'tabela_frete', title: 'Tabela de Frete' },
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

  // File Upload helper
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

  // Slide validation before next
  const canAdvance = (): boolean => {
    const current = currentSlideObj.id

    if (current === 'welcome') return true

    if (current === 'cnpjs') {
      return formData.cnpjs.every(c => c.cnpj.trim().length >= 14 && c.razao_social.trim() !== '')
    }

    if (current === 'tributacao') {
      return formData.cnpjs.every(c => c.tributacao !== '')
    }

    if (current === 'shopee_processos') {
      return formData.processos_shopee.length > 0
    }

    if (current === 'line_haul') {
      return (
        formData.percurso_line_haul.cnpj_hub_shopee.trim() !== '' &&
        formData.percurso_line_haul.cidade_origem.trim() !== '' &&
        formData.percurso_line_haul.uf_origem.trim() !== '' &&
        formData.percurso_line_haul.cnpj_recebedor.trim() !== '' &&
        formData.percurso_line_haul.endereco_destino.trim() !== ''
      )
    }

    if (current === 'rntrc') {
      return formData.cnpjs.every(c => c.rntrc.trim() !== '')
    }

    if (current === 'cte_anterior') {
      return formData.cnpjs.every(c => {
        if (c.ja_emitiu_cte === null) return false
        if (c.ja_emitiu_cte === true) return c.serie_nao_utilizada.trim() !== ''
        return true
      })
    }

    if (current === 'usuarios') {
      return formData.usuarios.some(u => u.nome.trim() !== '')
    }

    if (current === 'nfse') {
      if (formData.nfse.emitira_nfse === null) return false
      if (formData.nfse.emitira_nfse === true) {
        return (
          formData.nfse.inscricao_municipal.trim() !== '' &&
          formData.nfse.codigo_servico.trim() !== '' &&
          formData.nfse.aliquota_iss.trim() !== '' &&
          formData.nfse.nome_municipio.trim() !== ''
        )
      }
      return true
    }

    if (current === 'tabela_frete') {
      return true // Opcional ou pode conter anotação
    }

    return true
  }

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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.saveImplantacaoCheckpoint(
        implantacao.id, 
        formData, 
        user?.nome || user?.login || implantacao.nome_empresa
      )
      alert('Dados enviados com sucesso! Iremos dar segmento à sua implantação com os dados coletados.')
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
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {implantacao.nome_empresa}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2">
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Segurança Total</p>
                  <p className="text-[11px] text-slate-400">Seus dados fiscais e operacionais protegidos em ambiente seguro.</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Rápido e Prático</p>
                  <p className="text-[11px] text-slate-400">Questionário guiado passo a passo em menos de 5 minutos.</p>
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
                  <Building className="w-4 h-4" /> Pergunta 1 de 9
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
                          CNPJ <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="00.000.000/0000-00"
                          value={cnpjItem.cnpj}
                          onChange={(e) => handleUpdateCnpj(index, 'cnpj', formatCNPJ(e.target.value))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Razão Social <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
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
                  <FileText className="w-4 h-4" /> Pergunta 2 de 9
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
                        {c.razao_social || `CNPJ #${index + 1}`} ({c.cnpj || 'Sem CNPJ'})
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
                  <Truck className="w-4 h-4" /> Pergunta 3 de 9
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
                  <MapPin className="w-4 h-4" /> Pergunta 4 de 9 (Exclusivo Line Haul)
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Informe o Percurso do Line Haul
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Dados de origem (HUB Shopee) e destino da sua linha de transferência.
                </p>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      CNPJ HUB Shopee (Origem do Frete) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="00.000.000/0000-00"
                      value={formData.percurso_line_haul.cnpj_hub_shopee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        percurso_line_haul: { ...prev.percurso_line_haul, cnpj_hub_shopee: formatCNPJ(e.target.value) }
                      }))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cidade de Origem <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São Paulo"
                      value={formData.percurso_line_haul.cidade_origem}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        percurso_line_haul: { ...prev.percurso_line_haul, cidade_origem: e.target.value }
                      }))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UF da Origem <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.percurso_line_haul.uf_origem}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        percurso_line_haul: { ...prev.percurso_line_haul, uf_origem: e.target.value }
                      }))}
                      className="input-field text-sm"
                    >
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      CNPJ Recebedor (Transportadora/Hub) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="00.000.000/0000-00"
                      value={formData.percurso_line_haul.cnpj_recebedor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        percurso_line_haul: { ...prev.percurso_line_haul, cnpj_recebedor: formatCNPJ(e.target.value) }
                      }))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Endereço de Destino <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Av. das Nações, 1000 - Galpão 3 - Curitiba/PR"
                      value={formData.percurso_line_haul.endereco_destino}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        percurso_line_haul: { ...prev.percurso_line_haul, endereco_destino: e.target.value }
                      }))}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: RNTRC / ANTT */}
          {currentSlideObj.id === 'rntrc' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" /> Pergunta 5 de 9
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
                      <p className="text-[11px] text-slate-400">{c.cnpj}</p>
                    </div>

                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        required
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
                  <HelpCircle className="w-4 h-4" /> Pergunta 6 de 9
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
                        {c.razao_social || `CNPJ #${index + 1}`} ({c.cnpj})
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
                          required
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
                  <Users className="w-4 h-4" /> Pergunta 7 de 9
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
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
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
                  <FileSpreadsheet className="w-4 h-4" /> Pergunta 8 de 9
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Inscrição Municipal *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 123456-7"
                        value={formData.nfse.inscricao_municipal}
                        onChange={(e) => setFormData(prev => ({ ...prev, nfse: { ...prev.nfse, inscricao_municipal: e.target.value } }))}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Município *</label>
                      <input
                        type="text"
                        required
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Código do Serviço *</label>
                      <input
                        type="text"
                        required
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Alíquota ISS do Município (%) *</label>
                      <input
                        type="text"
                        required
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

          {/* SLIDE 9: TABELA DE FRETE */}
          {currentSlideObj.id === 'tabela_frete' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn">
              <div>
                <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Upload className="w-4 h-4" /> Pergunta 9 de 9
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

          {/* SLIDE 10: CONCLUSÃO E ENVIO */}
          {currentSlideObj.id === 'conclusao' && (
            <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn py-2">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  Tudo Pronto para o Envio!
                </h3>
                <p className="text-sm text-slate-300 max-w-lg mx-auto mt-1">
                  Confira o resumo das informações antes de confirmar. Iremos dar segmento imediato à sua implantação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                    <strong>Usuários Cadastrados:</strong> {formData.usuarios.length}
                  </p>
                  <p className="text-slate-300">
                    <strong>NFSe:</strong> {formData.nfse.emitira_nfse ? 'Sim' : 'Não'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-start gap-3">
                <Rocket className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-200 leading-relaxed">
                  Ao clicar em <strong>"Finalizar e Enviar Dados"</strong>, sua etapa de <strong>Checkpoint</strong> será automaticamente marcada como concluída e nossa equipe técnica iniciará a preparação da sua infraestrutura.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0 || submitting}
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

          {currentSlide < totalSlides - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-xs sm:text-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Enviando Dados...' : 'Finalizar e Enviar Dados'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
