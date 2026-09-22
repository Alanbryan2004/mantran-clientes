import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, Users, Plus, Search, 
  Calendar, Phone, Mail, CheckCircle2, 
  XCircle, Edit3, Trash2, Rocket, Calculator, 
  Target, Award, RefreshCw, Check, MessageSquare, Briefcase, 
  FileText, ShieldAlert, BarChart3, User
} from 'lucide-react'
import { 
  api, 
  type OportunidadeComercial, 
  type MetaComercial 
} from '../lib/api'
import { getLoggedUser, isAdminUser } from '../lib/auth'
import { NovaImplantacaoModal } from '../components/NovaImplantacaoModal'
import clsx from 'clsx'

const ESTAGIOS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  lead: {
    label: 'Lead / Contato',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Users
  },
  apresentacao: {
    label: 'Demonstração',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: Calendar
  },
  proposta: {
    label: 'Proposta Enviada',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: FileText
  },
  negociacao: {
    label: 'Em Negociação',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    icon: MessageSquare
  },
  ganho: {
    label: 'Contrato Ganho',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: CheckCircle2
  },
  perdido: {
    label: 'Perdida',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: XCircle
  }
}

const ESTAGIOS_ORDEM = ['lead', 'apresentacao', 'proposta', 'negociacao', 'ganho', 'perdido'] as const

const ORIGENS_LEAD = [
  'Site Mantran',
  'Indicação',
  'Outbound / Prospecção',
  'Parceiro Shopee',
  'Evento / Feira',
  'Redes Sociais / Google',
  'Outro'
]

export function Comercial() {
  const user = getLoggedUser()
  const isAdmin = isAdminUser()
  const isComercial = user?.perfil?.toLowerCase() === 'comercial'

  const [activeTab, setActiveTab] = useState<'pipeline' | 'simulador' | 'metas'>('pipeline')
  
  // Data
  const [oportunidades, setOportunidades] = useState<OportunidadeComercial[]>([])
  const [metas, setMetas] = useState<MetaComercial[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [modulosDisponiveis, setModulosDisponiveis] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Filters (Kanban)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  // Month for Metas
  const [currentMesAno, setCurrentMesAno] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Modals
  const [isModalOportunidadeOpen, setIsModalOportunidadeOpen] = useState(false)
  const [editingOportunidade, setEditingOportunidade] = useState<OportunidadeComercial | null>(null)
  const [modalSaving, setModalSaving] = useState(false)

  // Modal Motivo Perda
  const [oportunidadeToLose, setOportunidadeToLose] = useState<OportunidadeComercial | null>(null)
  const [motivoPerdaTexto, setMotivoPerdaTexto] = useState('')

  // Modal Metas
  const [isModalMetasOpen, setIsModalMetasOpen] = useState(false)
  const [metaMrrInput, setMetaMrrInput] = useState<number>(10000)
  const [metaSetupInput, setMetaSetupInput] = useState<number>(20000)
  const [metaQtdInput, setMetaQtdInput] = useState<number>(5)

  // Nova Implantação Trigger
  const [isNovaImplantacaoOpen, setIsNovaImplantacaoOpen] = useState(false)

  // Form State for Oportunidade
  const [formNomeEmpresa, setFormNomeEmpresa] = useState('')
  const [formNomeContato, setFormNomeContato] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formEstagio, setFormEstagio] = useState<OportunidadeComercial['estagio']>('lead')
  const [formValorSetup, setFormValorSetup] = useState<number>(2500)
  const [formValorMensalidade, setFormValorMensalidade] = useState<number>(850)
  const [formTipoCliente, setFormTipoCliente] = useState<'NORMAL' | 'SHOPEE'>('NORMAL')
  const [formVolumeCte, setFormVolumeCte] = useState<number>(1000)
  const [formQtdUsuarios, setFormQtdUsuarios] = useState<number>(3)
  const [formModulosInteresse, setFormModulosInteresse] = useState<string[]>([])
  const [formOrigemLead, setFormOrigemLead] = useState('Site Mantran')
  const [formVendedorId, setFormVendedorId] = useState('')
  const [formTmsAtual, setFormTmsAtual] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formDataPrevisao, setFormDataPrevisao] = useState('')

  // Simulator State
  const [simEmpresa, setSimEmpresa] = useState('')
  const [simContato, setSimContato] = useState('')
  const [simTelefone, setSimTelefone] = useState('')
  const [simEmail, setSimEmail] = useState('')
  const [simTipo, setSimTipo] = useState<'NORMAL' | 'SHOPEE'>('NORMAL')
  const [simVolumeCte, setSimVolumeCte] = useState<number>(2500)
  const [simQtdUsuarios, setSimQtdUsuarios] = useState<number>(4)
  const [simModulos, setSimModulos] = useState<string[]>(['Operação', 'Financeiro', 'EDI Proceda'])
  const [simSetupBase, setSimSetupBase] = useState<number>(3000)
  const [simMensalidadeBase, setSimMensalidadeBase] = useState<number>(1200)
  const [simDesconto, setSimDesconto] = useState<number>(0)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  const loadAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)

      const [opps, vends, mods, metaList] = await Promise.all([
        api.getOportunidadesComerciais(),
        api.getVendedoresComerciais(),
        api.getModulosMantran(),
        api.getMetasComerciais(currentMesAno)
      ])

      setOportunidades(opps)
      setVendedores(vends)
      setModulosDisponiveis(mods)
      setMetas(metaList)

      // Set default meta inputs if available
      const globalMeta = metaList.find(m => !m.vendedor_id)
      if (globalMeta) {
        setMetaMrrInput(globalMeta.meta_mrr || 10000)
        setMetaSetupInput(globalMeta.meta_setup || 20000)
        setMetaQtdInput(globalMeta.meta_qtd_fechamentos || 5)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados comerciais:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [currentMesAno])

  // Open modal create
  const handleOpenCreateOportunidade = (estagioInicial: OportunidadeComercial['estagio'] = 'lead') => {
    setEditingOportunidade(null)
    setFormNomeEmpresa('')
    setFormNomeContato('')
    setFormTelefone('')
    setFormEmail('')
    setFormEstagio(estagioInicial)
    setFormValorSetup(2500)
    setFormValorMensalidade(850)
    setFormTipoCliente('NORMAL')
    setFormVolumeCte(1000)
    setFormQtdUsuarios(3)
    setFormModulosInteresse(['Operação', 'Financeiro'])
    setFormOrigemLead('Site Mantran')
    setFormVendedorId(user?.id || '')
    setFormTmsAtual('')
    setFormObservacoes('')
    setFormDataPrevisao('')
    setIsModalOportunidadeOpen(true)
  }

  // Open modal edit
  const handleOpenEditOportunidade = (opp: OportunidadeComercial) => {
    setEditingOportunidade(opp)
    setFormNomeEmpresa(opp.nome_empresa)
    setFormNomeContato(opp.nome_contato || '')
    setFormTelefone(opp.telefone || '')
    setFormEmail(opp.email || '')
    setFormEstagio(opp.estagio)
    setFormValorSetup(opp.valor_setup || 0)
    setFormValorMensalidade(opp.valor_mensalidade || 0)
    setFormTipoCliente(opp.tipo_cliente || 'NORMAL')
    setFormVolumeCte(opp.volume_estimado_cte || 0)
    setFormQtdUsuarios(opp.qtd_usuarios || 1)
    setFormModulosInteresse(opp.modulos_interesse || [])
    setFormOrigemLead(opp.origem_lead || 'Site Mantran')
    setFormVendedorId(opp.vendedor_id || '')
    setFormTmsAtual(opp.tms_atual || '')
    setFormObservacoes(opp.observacoes || '')
    setFormDataPrevisao(opp.data_previsao_fechamento || '')
    setIsModalOportunidadeOpen(true)
  }

  // Save opportunity
  const handleSaveOportunidade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNomeEmpresa.trim()) {
      alert('Informe o nome da empresa.')
      return
    }

    try {
      setModalSaving(true)
      const vendObj = vendedores.find(v => v.id === formVendedorId)
      const payload: Partial<OportunidadeComercial> = {
        nome_empresa: formNomeEmpresa.trim(),
        nome_contato: formNomeContato.trim(),
        telefone: formTelefone.trim(),
        email: formEmail.trim(),
        estagio: formEstagio,
        valor_setup: formValorSetup,
        valor_mensalidade: formValorMensalidade,
        tipo_cliente: formTipoCliente,
        volume_estimado_cte: formVolumeCte,
        qtd_usuarios: formQtdUsuarios,
        modulos_interesse: formModulosInteresse,
        origem_lead: formOrigemLead,
        vendedor_id: formVendedorId || null,
        vendedor_nome: vendObj ? (vendObj.nome || vendObj.login) : null,
        tms_atual: formTmsAtual.trim(),
        observacoes: formObservacoes.trim(),
        data_previsao_fechamento: formDataPrevisao || null
      }

      if (editingOportunidade) {
        const updated = await api.updateOportunidadeComercial(editingOportunidade.id, payload)
        setOportunidades(prev => prev.map(o => o.id === updated.id ? updated : o))
        showToast(`Oportunidade "${updated.nome_empresa}" atualizada!`)
      } else {
        const created = await api.createOportunidadeComercial(payload)
        setOportunidades(prev => [created, ...prev])
        showToast(`Oportunidade "${created.nome_empresa}" cadastrada!`)
      }

      setIsModalOportunidadeOpen(false)
    } catch (err: any) {
      alert('Erro ao salvar oportunidade: ' + err.message)
    } finally {
      setModalSaving(false)
    }
  }

  // Move Estagio
  const handleMoveEstagio = async (opp: OportunidadeComercial, novoEstagio: OportunidadeComercial['estagio']) => {
    if (novoEstagio === 'perdido') {
      setOportunidadeToLose(opp)
      setMotivoPerdaTexto('')
      return
    }

    try {
      // Optimistic update
      setOportunidades(prev => prev.map(o => o.id === opp.id ? { ...o, estagio: novoEstagio } : o))
      await api.updateEstagioOportunidade(opp.id, novoEstagio)
      showToast(`Oportunidade "${opp.nome_empresa}" movida para ${ESTAGIOS_CONFIG[novoEstagio].label}!`)
    } catch (err: any) {
      alert('Erro ao mover estágio: ' + err.message)
      loadAllData(true)
    }
  }

  // Confirm Lose
  const handleConfirmLose = async () => {
    if (!oportunidadeToLose) return
    try {
      setOportunidades(prev => prev.map(o => o.id === oportunidadeToLose.id ? { ...o, estagio: 'perdido', motivo_perda: motivoPerdaTexto } : o))
      await api.updateEstagioOportunidade(oportunidadeToLose.id, 'perdido', motivoPerdaTexto)
      showToast(`Oportunidade marcada como Perdida.`)
      setOportunidadeToLose(null)
    } catch (err: any) {
      alert('Erro ao salvar motivo de perda: ' + err.message)
    }
  }

  // Delete
  const handleDeleteOportunidade = async (opp: OportunidadeComercial) => {
    if (!confirm(`Tem certeza que deseja excluir a oportunidade "${opp.nome_empresa}"?`)) return
    try {
      setOportunidades(prev => prev.filter(o => o.id !== opp.id))
      await api.deleteOportunidadeComercial(opp.id)
      showToast(`Oportunidade excluída.`)
    } catch (err: any) {
      alert('Erro ao excluir oportunidade: ' + err.message)
    }
  }

  // Save Meta
  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.saveMetaComercial({
        mes_ano: currentMesAno,
        vendedor_id: null,
        vendedor_nome: 'Meta Global',
        meta_mrr: metaMrrInput,
        meta_setup: metaSetupInput,
        meta_qtd_fechamentos: metaQtdInput
      })
      showToast('Metas do mês salvas com sucesso!')
      setIsModalMetasOpen(false)
      loadAllData(true)
    } catch (err: any) {
      alert('Erro ao salvar meta: ' + err.message)
    }
  }

  // Save Simulator to Kanban
  const handleSaveSimulatorToKanban = async () => {
    if (!simEmpresa.trim()) {
      alert('Informe o nome da empresa na simulação.')
      return
    }

    try {
      const valorFinalSetup = Math.max(0, simSetupBase - simDesconto)
      const created = await api.createOportunidadeComercial({
        nome_empresa: simEmpresa.trim(),
        nome_contato: simContato.trim(),
        telefone: simTelefone.trim(),
        email: simEmail.trim(),
        estagio: 'proposta',
        valor_setup: valorFinalSetup,
        valor_mensalidade: simMensalidadeBase,
        tipo_cliente: simTipo,
        volume_estimado_cte: simVolumeCte,
        qtd_usuarios: simQtdUsuarios,
        modulos_interesse: simModulos,
        origem_lead: 'Site Mantran',
        vendedor_id: user?.id || null,
        vendedor_nome: user?.nome || user?.login || 'Comercial'
      })

      setOportunidades(prev => [created, ...prev])
      showToast(`Proposta da "${created.nome_empresa}" salva no Funil de Vendas!`)
      setActiveTab('pipeline')
    } catch (err: any) {
      alert('Erro ao salvar proposta no funil: ' + err.message)
    }
  }

  // Geradores de Proposta Comercial
  const generateEmailProposalText = (params?: {
    empresa?: string
    contato?: string
    tipo?: 'NORMAL' | 'SHOPEE'
    volumeCte?: number
    qtdUsuarios?: number
    modulos?: string[]
    setup?: number
    mensalidade?: number
    vendedor?: string
  }) => {
    const empresa = (params?.empresa !== undefined ? params.empresa : simEmpresa).trim()
    const contato = (params?.contato !== undefined ? params.contato : simContato).trim()
    const tipo = params?.tipo !== undefined ? params.tipo : simTipo
    const volumeCte = params?.volumeCte !== undefined ? params.volumeCte : simVolumeCte
    const qtdUsuarios = params?.qtdUsuarios !== undefined ? params.qtdUsuarios : simQtdUsuarios
    const modulos = params?.modulos !== undefined ? params.modulos : simModulos
    const setup = params?.setup !== undefined ? params.setup : Math.max(0, simSetupBase - simDesconto)
    const mensalidade = params?.mensalidade !== undefined ? params.mensalidade : simMensalidadeBase
    const vendedor = (params?.vendedor !== undefined ? params.vendedor : (user?.nome || 'Equipe Comercial')).trim()

    const opTitulo = tipo === 'SHOPEE' ? 'Operação Shopee 4PL' : (empresa ? `Operação ${empresa}` : 'Operação TMS')
    const saudacaoContato = contato ? contato : (empresa ? empresa : 'Alan')
    const empresaDesc = empresa || 'sua empresa'
    const tipoOpDesc = tipo === 'SHOPEE' ? 'Operações Shopee 4PL' : 'Transporte Rodoviário de Cargas'

    return `Assunto: Proposta Comercial | Mantran TMS – ${opTitulo}
Prezado ${saudacaoContato},
Conforme alinhado, apresentamos nossa proposta comercial para utilização do Mantran TMS, contemplando os recursos necessários para atendimento à operação da ${empresaDesc}.
A solução Mantran foi desenvolvida para apoiar a gestão das operações de transporte, proporcionando maior controle operacional, integração entre processos e eficiência na gestão das informações.
ESCOPO DA SOLUÇÃO
Tipo de operação
${tipoOpDesc}
Volume estimado
${volumeCte.toLocaleString('pt-BR')} CT-e/mês
Usuários
Até ${qtdUsuarios} usuários GPO
Módulos e integrações contemplados
${modulos.length > 0 ? modulos.map(m => `- ${m}`).join('\n') : '- Módulo Operacional Completo'}
INVESTIMENTO
Descrição	Valor
Implantação e configuração inicial	R$ ${setup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Licenciamento mensal da solução	R$ ${mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês


O valor de implantação contempla as atividades necessárias para configuração inicial da solução, parametrização do ambiente e preparação para início da operação, conforme o escopo apresentado.
A mensalidade corresponde ao licenciamento e utilização dos módulos e integrações descritos nesta proposta.
PRÓXIMOS PASSOS
Após a aprovação da proposta, nossa equipe dará início ao processo de implantação e onboarding, realizando o levantamento das informações necessárias, parametrizações e acompanhamento até a entrada em operação.
Esta proposta comercial possui validade de 15 dias a partir da data de emissão.
Permanecemos à disposição para quaisquer esclarecimentos e esperamos iniciar em breve esta parceria.
Atenciosamente,
${vendedor || 'Equipe Comercial'}
Mantran Tecnologias
Soluções em Tecnologia para Transporte e Logística`
  }

  const generateWhatsAppProposalText = (params?: {
    empresa?: string
    contato?: string
    tipo?: 'NORMAL' | 'SHOPEE'
    volumeCte?: number
    qtdUsuarios?: number
    modulos?: string[]
    setup?: number
    mensalidade?: number
    vendedor?: string
  }) => {
    const empresa = (params?.empresa !== undefined ? params.empresa : simEmpresa).trim()
    const contato = (params?.contato !== undefined ? params.contato : simContato).trim()
    const tipo = params?.tipo !== undefined ? params.tipo : simTipo
    const volumeCte = params?.volumeCte !== undefined ? params.volumeCte : simVolumeCte
    const qtdUsuarios = params?.qtdUsuarios !== undefined ? params.qtdUsuarios : simQtdUsuarios
    const modulos = params?.modulos !== undefined ? params.modulos : simModulos
    const setup = params?.setup !== undefined ? params.setup : Math.max(0, simSetupBase - simDesconto)
    const mensalidade = params?.mensalidade !== undefined ? params.mensalidade : simMensalidadeBase
    const vendedor = (params?.vendedor !== undefined ? params.vendedor : (user?.nome || 'Equipe Comercial')).trim()

    const opTitulo = tipo === 'SHOPEE' ? 'Operação Shopee 4PL' : (empresa ? `Operação ${empresa}` : 'Operação TMS')
    const saudacaoContato = contato ? contato : (empresa ? empresa : 'Alan')
    const empresaDesc = empresa || 'sua empresa'
    const tipoOpDesc = tipo === 'SHOPEE' ? 'Operações Shopee 4PL' : 'Transporte Rodoviário de Cargas'

    return `*Assunto: Proposta Comercial | Mantran TMS – ${opTitulo}*

Prezado(a) *${saudacaoContato}*,
Conforme alinhado, apresentamos nossa proposta comercial para utilização do *Mantran TMS*, contemplando os recursos necessários para atendimento à operação da *${empresaDesc}*.

A solução Mantran foi desenvolvida para apoiar a gestão das operações de transporte, proporcionando maior controle operacional, integração entre processos e eficiência na gestão das informações.

*ESCOPO DA SOLUÇÃO*
*Tipo de operação*
${tipoOpDesc}

*Volume estimado*
${volumeCte.toLocaleString('pt-BR')} CT-e/mês

*Usuários*
Até ${qtdUsuarios} usuários GPO

*Módulos e integrações contemplados*
${modulos.length > 0 ? modulos.map(m => `- ${m}`).join('\n') : '- Módulo Operacional Completo'}

*INVESTIMENTO*
• *Implantação e configuração inicial:* R$ ${setup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• *Licenciamento mensal da solução:* R$ ${mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês

_O valor de implantação contempla as atividades necessárias para configuração inicial da solução, parametrização do ambiente e preparação para início da operação, conforme o escopo apresentado._
_A mensalidade corresponde ao licenciamento e utilização dos módulos e integrações descritos nesta proposta._

*PRÓXIMOS PASSOS*
Após a aprovação da proposta, nossa equipe dará início ao processo de implantação e onboarding, realizando o levantamento das informações necessárias, parametrizações e acompanhamento até a entrada em operação.

Esta proposta comercial possui validade de 15 dias a partir da data de emissão.
Permanecemos à disposição para quaisquer esclarecimentos e esperamos iniciar em breve esta parceria.

Atenciosamente,
*${vendedor || 'Equipe Comercial'}*
*Mantran Tecnologias*
_Soluções em Tecnologia para Transporte e Logística_`
  }

  // Handlers de Cópia e Envio
  const [simCopiedType, setSimCopiedType] = useState<'email' | 'whatsapp' | null>(null)

  const handleCopyEmailProposal = () => {
    const texto = generateEmailProposalText()
    navigator.clipboard.writeText(texto)
    setSimCopiedType('email')
    setTimeout(() => setSimCopiedType(null), 2500)
    showToast('Proposta formal para E-MAIL copiada com sucesso!')
  }

  const handleCopyWhatsAppProposal = () => {
    const texto = generateWhatsAppProposalText()
    navigator.clipboard.writeText(texto)
    setSimCopiedType('whatsapp')
    setTimeout(() => setSimCopiedType(null), 2500)
    showToast('Proposta formatada para WHATSAPP copiada com sucesso!')
  }

  const handleOpenEmailClient = () => {
    const opTitulo = simTipo === 'SHOPEE' ? 'Operação Shopee 4PL' : (simEmpresa ? `Operação ${simEmpresa}` : 'Operação TMS')
    const subject = encodeURIComponent(`Proposta Comercial | Mantran TMS – ${opTitulo}`)
    const fullText = generateEmailProposalText()
    // Remove "Assunto: ..." da primeira linha para o body
    const bodyLines = fullText.split('\n')
    const cleanBody = bodyLines.slice(1).join('\n').trim()
    const mailtoUrl = `mailto:${simEmail || ''}?subject=${subject}&body=${encodeURIComponent(cleanBody)}`
    window.location.href = mailtoUrl
  }

  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = simTelefone.replace(/\D/g, '')
    const fullText = generateWhatsAppProposalText()
    const waUrl = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(fullText)}`
      : `https://wa.me/?text=${encodeURIComponent(fullText)}`
    window.open(waUrl, '_blank')
  }

  const handleLoadOppIntoSimulator = (opp: OportunidadeComercial) => {
    setSimEmpresa(opp.nome_empresa || '')
    setSimContato(opp.nome_contato || '')
    setSimTelefone(opp.telefone || '')
    setSimEmail(opp.email || '')
    setSimTipo(opp.tipo_cliente || 'NORMAL')
    setSimVolumeCte(opp.volume_estimado_cte || 2500)
    setSimQtdUsuarios(opp.qtd_usuarios || 4)
    if (opp.modulos_interesse && opp.modulos_interesse.length > 0) {
      setSimModulos(opp.modulos_interesse)
    }
    setSimSetupBase(opp.valor_setup || 3000)
    setSimMensalidadeBase(opp.valor_mensalidade || 1200)
    setSimDesconto(0)
    setActiveTab('simulador')
    showToast(`Dados de "${opp.nome_empresa}" carregados no Simulador!`)
  }

  const handleCopyOppEmailProposal = (opp: OportunidadeComercial) => {
    const text = generateEmailProposalText({
      empresa: opp.nome_empresa,
      contato: opp.nome_contato || undefined,
      tipo: opp.tipo_cliente,
      volumeCte: opp.volume_estimado_cte || undefined,
      qtdUsuarios: opp.qtd_usuarios || undefined,
      modulos: opp.modulos_interesse || undefined,
      setup: opp.valor_setup || undefined,
      mensalidade: opp.valor_mensalidade || undefined,
      vendedor: opp.vendedor_nome || undefined
    })
    navigator.clipboard.writeText(text)
    showToast(`Proposta Formal de "${opp.nome_empresa}" copiada para E-MAIL!`)
  }

  const handleCopyOppWhatsAppProposal = (opp: OportunidadeComercial) => {
    const text = generateWhatsAppProposalText({
      empresa: opp.nome_empresa,
      contato: opp.nome_contato || undefined,
      tipo: opp.tipo_cliente,
      volumeCte: opp.volume_estimado_cte || undefined,
      qtdUsuarios: opp.qtd_usuarios || undefined,
      modulos: opp.modulos_interesse || undefined,
      setup: opp.valor_setup || undefined,
      mensalidade: opp.valor_mensalidade || undefined,
      vendedor: opp.vendedor_nome || undefined
    })
    navigator.clipboard.writeText(text)
    showToast(`Proposta de "${opp.nome_empresa}" copiada para WHATSAPP!`)
  }

  // Filtered Kanban
  const filteredOportunidades = useMemo(() => {
    return oportunidades.filter(o => {
      const matchSearch = !searchTerm || 
        (o.nome_empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.nome_contato || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.telefone || '').includes(searchTerm)

      const matchVend = filtroVendedor === 'todos' || o.vendedor_id === filtroVendedor
      const matchTipo = filtroTipo === 'todos' || o.tipo_cliente === filtroTipo

      return matchSearch && matchVend && matchTipo
    })
  }, [oportunidades, searchTerm, filtroVendedor, filtroTipo])

  // Statistics & KPI
  const stats = useMemo(() => {
    const total = oportunidades.length
    const ativas = oportunidades.filter(o => o.estagio !== 'ganho' && o.estagio !== 'perdido')
    const ganhas = oportunidades.filter(o => o.estagio === 'ganho')
    const perdidas = oportunidades.filter(o => o.estagio === 'perdido')

    const pipelineSetup = ativas.reduce((acc, o) => acc + (o.valor_setup || 0), 0)
    const pipelineMrr = ativas.reduce((acc, o) => acc + (o.valor_mensalidade || 0), 0)

    const ganhoMrr = ganhas.reduce((acc, o) => acc + (o.valor_mensalidade || 0), 0)
    const ganhoSetup = ganhas.reduce((acc, o) => acc + (o.valor_setup || 0), 0)

    const taxaConversao = total > 0 ? ((ganhas.length / total) * 100).toFixed(1) : '0.0'
    const ticketMedioMrr = ganhas.length > 0 ? (ganhoMrr / ganhas.length) : 0

    // Metas do mês atual
    const metaGlobal = metas.find(m => !m.vendedor_id) || {
      meta_mrr: 10000,
      meta_setup: 20000,
      meta_qtd_fechamentos: 5
    }

    const pctMrr = metaGlobal.meta_mrr ? Math.min(100, Math.round((ganhoMrr / metaGlobal.meta_mrr) * 100)) : 0
    const pctSetup = metaGlobal.meta_setup ? Math.min(100, Math.round((ganhoSetup / metaGlobal.meta_setup) * 100)) : 0
    const pctQtd = metaGlobal.meta_qtd_fechamentos ? Math.min(100, Math.round((ganhas.length / metaGlobal.meta_qtd_fechamentos) * 100)) : 0

    return {
      total,
      ativasCount: ativas.length,
      ganhasCount: ganhas.length,
      perdidasCount: perdidas.length,
      pipelineSetup,
      pipelineMrr,
      ganhoMrr,
      ganhoSetup,
      taxaConversao,
      ticketMedioMrr,
      metaGlobal,
      pctMrr,
      pctSetup,
      pctQtd
    }
  }, [oportunidades, metas])

  if (!isAdmin && !isComercial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito ao Comercial</h2>
        <p className="text-slate-400 max-w-md mb-6">
          Esta área é visível exclusivamente para usuários dos perfis Comercial e Administrador.
        </p>
        <button onClick={() => window.history.back()} className="btn-secondary">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                Gestão Comercial & Vendas
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                  TMS Mantran
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Funil de vendas integrado com Implantação, simulador de propostas e controle de metas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadAllData(true)}
            disabled={loading || refreshing}
            title="Atualizar dados"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin text-cyan-400")} />
          </button>
          
          <button
            onClick={() => handleOpenCreateOportunidade()}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nova Oportunidade
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={clsx(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all shrink-0",
            activeTab === 'pipeline'
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Briefcase className="w-4 h-4" />
          <span>Funil de Vendas (Kanban)</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {stats.ativasCount} ativas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('simulador')}
          className={clsx(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all shrink-0",
            activeTab === 'simulador'
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Calculator className="w-4 h-4" />
          <span>Simulador de Propostas</span>
        </button>

        <button
          onClick={() => setActiveTab('metas')}
          className={clsx(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all shrink-0",
            activeTab === 'metas'
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Target className="w-4 h-4" />
          <span>Metas & Indicadores</span>
        </button>
      </div>

      {/* TAB 1: FUNIL DE VENDAS KANBAN */}
      {activeTab === 'pipeline' && (
        <div className="space-y-5 animate-fade-in">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <span className="text-xs text-slate-400 font-medium">Pipeline Ativo (MRR)</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">
                R$ {stats.pipelineMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">{stats.ativasCount} negociações em andamento</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <span className="text-xs text-slate-400 font-medium">Pipeline Ativo (Setup)</span>
              <p className="text-xl font-bold text-blue-400 mt-1">
                R$ {stats.pipelineSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">potencial de implantação</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <span className="text-xs text-emerald-400 font-medium">Contratos Ganhos</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {stats.ganhasCount} clientes
              </p>
              <span className="text-[11px] text-slate-500">R$ {stats.ganhoMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês adicionados</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <span className="text-xs text-purple-400 font-medium">Taxa de Conversão</span>
              <p className="text-xl font-bold text-purple-400 mt-1">
                {stats.taxaConversao}%
              </p>
              <span className="text-[11px] text-slate-500">{stats.total} oportunidades registradas</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, contato, telefone ou email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filtroVendedor}
                onChange={e => setFiltroVendedor(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-cyan-500"
              >
                <option value="todos">Todos os Vendedores</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nome || v.login}</option>
                ))}
              </select>

              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-cyan-500"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="NORMAL">Normal Mantran</option>
                <option value="SHOPEE">Shopee 4PL</option>
              </select>
            </div>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto min-h-[560px]">
            {ESTAGIOS_ORDEM.map(estagioKey => {
              const estConfig = ESTAGIOS_CONFIG[estagioKey]
              const Icon = estConfig.icon
              const oppsInStage = filteredOportunidades.filter(o => o.estagio === estagioKey)
              const sumMrr = oppsInStage.reduce((acc, o) => acc + (o.valor_mensalidade || 0), 0)

              return (
                <div 
                  key={estagioKey}
                  className="bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col max-h-[780px]"
                >
                  {/* Column Header */}
                  <div className={clsx("p-3 border-b rounded-t-2xl flex items-center justify-between", estConfig.bg, estConfig.border)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={clsx("w-4 h-4 shrink-0", estConfig.color)} />
                      <span className={clsx("text-xs font-bold truncate", estConfig.color)}>
                        {estConfig.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950/80 text-white border border-slate-800">
                      {oppsInStage.length}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 bg-slate-950/40 text-[10px] text-slate-400 flex justify-between border-b border-slate-800/60">
                    <span>MRR Total:</span>
                    <strong className="text-slate-200">R$ {sumMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong>
                  </div>

                  {/* Cards List */}
                  <div className="p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
                    {oppsInStage.length === 0 ? (
                      <div className="py-8 text-center text-slate-600 text-xs italic">
                        Nenhum lead
                      </div>
                    ) : (
                      oppsInStage.map(opp => (
                        <div
                          key={opp.id}
                          className="p-3 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md space-y-2 group"
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                {opp.nome_empresa}
                              </h4>
                              {opp.nome_contato && (
                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <User className="w-3 h-3 text-slate-500" />
                                  {opp.nome_contato}
                                </p>
                              )}
                            </div>

                            <span className={clsx(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                              opp.tipo_cliente === 'SHOPEE' 
                                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" 
                                : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            )}>
                              {opp.tipo_cliente === 'SHOPEE' ? 'Shopee' : 'Normal'}
                            </span>
                          </div>

                          {/* Valores (Setup & MRR) */}
                          <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                            <div>
                              <span className="text-[9px] text-slate-500 block uppercase">Setup</span>
                              <span className="font-bold text-slate-200">
                                R$ {Number(opp.valor_setup || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block uppercase">Mensalidade</span>
                              <span className="font-bold text-emerald-400">
                                R$ {Number(opp.valor_mensalidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          {/* Módulos de Interesse Chips */}
                          {opp.modulos_interesse && opp.modulos_interesse.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {opp.modulos_interesse.slice(0, 3).map((mod, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                  {mod}
                                </span>
                              ))}
                              {opp.modulos_interesse.length > 3 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-500">
                                  +{opp.modulos_interesse.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Contact Shortcuts & Vendedor */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              {opp.telefone && (
                                <a
                                  href={`https://wa.me/${opp.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`WhatsApp: ${opp.telefone}`}
                                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                              {opp.email && (
                                <a
                                  href={`mailto:${opp.email}`}
                                  title={`Email: ${opp.email}`}
                                  className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                                >
                                  <Mail className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                              {opp.vendedor_nome || 'Sem vendedor'}
                            </span>
                          </div>

                          {/* Motivo de perda se for perdido */}
                          {opp.estagio === 'perdido' && opp.motivo_perda && (
                            <div className="text-[10px] text-rose-400/90 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                              <strong>Motivo:</strong> {opp.motivo_perda}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-1 gap-1">
                            {/* Move stage buttons */}
                            <div className="flex items-center gap-1">
                              <select
                                value={opp.estagio}
                                onChange={e => handleMoveEstagio(opp, e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-cyan-500"
                              >
                                {ESTAGIOS_ORDEM.map(stKey => (
                                  <option key={stKey} value={stKey}>
                                    {ESTAGIOS_CONFIG[stKey].label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Converter em Implantação Button */}
                              {opp.estagio === 'ganho' && (
                                <button
                                  type="button"
                                  onClick={() => setIsNovaImplantacaoOpen(true)}
                                  title="Iniciar Implantação deste Cliente"
                                  className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                                >
                                  <Rocket className="w-3 h-3" />
                                </button>
                              )}

                              {/* Copiar Proposta E-mail */}
                              <button
                                type="button"
                                onClick={() => handleCopyOppEmailProposal(opp)}
                                title="Copiar Proposta Formal (E-mail)"
                                className="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300"
                              >
                                <Mail className="w-3 h-3" />
                              </button>

                              {/* Copiar Proposta WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleCopyOppWhatsAppProposal(opp)}
                                title="Copiar Proposta (WhatsApp)"
                                className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>

                              {/* Abrir no Simulador */}
                              <button
                                type="button"
                                onClick={() => handleLoadOppIntoSimulator(opp)}
                                title="Abrir no Simulador de Propostas"
                                className="p-1 rounded hover:bg-purple-500/20 text-slate-400 hover:text-purple-300"
                              >
                                <Calculator className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditOportunidade(opp)}
                                title="Editar Oportunidade"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteOportunidade(opp)}
                                title="Excluir Oportunidade"
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SIMULADOR DE PROPOSTAS */}
      {activeTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Formulário do Simulador (Col 7) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                  Montador de Proposta Comercial
                </h3>
                <p className="text-xs text-slate-400">Preencha os dados e módulos para calcular o setup e mensalidade.</p>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  placeholder="Ex: Transportes ABC"
                  value={simEmpresa}
                  onChange={e => setSimEmpresa(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contato Principal</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Mendes"
                  value={simContato}
                  onChange={e => setSimContato(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 98765-4321"
                  value={simTelefone}
                  onChange={e => setSimTelefone(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={simEmail}
                  onChange={e => setSimEmail(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimTipo('NORMAL')}
                    className={clsx(
                      "py-2 rounded-xl text-xs font-bold border transition-all",
                      simTipo === 'NORMAL' ? "bg-blue-500/20 border-blue-500 text-blue-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    )}
                  >
                    Normal Mantran
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimTipo('SHOPEE')}
                    className={clsx(
                      "py-2 rounded-xl text-xs font-bold border transition-all",
                      simTipo === 'SHOPEE' ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    )}
                  >
                    Shopee 4PL
                  </button>
                </div>
              </div>
            </div>

            {/* Parâmetros de Volume e Usuários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Volume Estimado (CTe / MDFe mês)
                </label>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={simVolumeCte}
                  onChange={e => setSimVolumeCte(Number(e.target.value))}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade de Usuários GPO
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={simQtdUsuarios}
                  onChange={e => setSimQtdUsuarios(Number(e.target.value))}
                  className="input-field w-full text-xs py-2"
                />
              </div>
            </div>

            {/* Módulos e Integrações Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
                Módulos e Integrações Inclusos no Pacote ({simModulos.length} selecionados)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {modulosDisponiveis.map(m => {
                  const isChecked = simModulos.includes(m.nome)
                  return (
                    <label
                      key={m.id}
                      className={clsx(
                        "flex items-center p-2 rounded-xl border text-xs cursor-pointer transition-all select-none",
                        isChecked
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center mr-2 transition-colors shrink-0",
                        isChecked ? "bg-cyan-500 border-cyan-500 text-slate-950" : "border-slate-600 bg-slate-900"
                      )}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={() => {
                          setSimModulos(prev => isChecked ? prev.filter(x => x !== m.nome) : [...prev, m.nome])
                        }}
                      />
                      <span className="truncate">{m.nome}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Precificação Manual / Ajustes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Setup / Implantação (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={simSetupBase}
                  onChange={e => setSimSetupBase(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 font-bold text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mensalidade / MRR (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={simMensalidadeBase}
                  onChange={e => setSimMensalidadeBase(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Desconto no Setup (R$)</label>
                <input
                  type="number"
                  min="0"
                  value={simDesconto}
                  onChange={e => setSimDesconto(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 text-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Preview da Proposta Comercial (Col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Proposta Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Resumo da Proposta</span>
                  <h4 className="text-lg font-black text-white">{simEmpresa || 'Nome da Empresa'}</h4>
                  <p className="text-xs text-slate-400">Contato: {simContato || 'Aos cuidados da diretoria'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              {/* Escopo de Módulos */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Escopo Contratado ({simModulos.length} itens)
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {simModulos.map((m, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Totais de Investimento */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Implantação / Setup Inicial:</span>
                  <div className="text-right">
                    {simDesconto > 0 && (
                      <span className="text-xs text-slate-500 line-through mr-2">
                        R$ {simSetupBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className="text-base font-bold text-white">
                      R$ {Math.max(0, simSetupBase - simDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">Mensalidade Recorrente (MRR):</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    R$ {simMensalidadeBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">/mês</span>
                  </span>
                </div>
              </div>

              {/* Ações da Proposta */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSimulatorToKanban}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Salvar Oportunidade no Funil de Vendas
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyEmailProposal}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm group hover:border-cyan-500/50"
                  >
                    {simCopiedType === 'email' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Mail className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                    )}
                    <span className="truncate">
                      {simCopiedType === 'email' ? 'E-mail Copiado!' : 'Copiar Texto para E-mail'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyWhatsAppProposal}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm group hover:border-emerald-500/50"
                  >
                    {simCopiedType === 'whatsapp' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                    )}
                    <span className="truncate">
                      {simCopiedType === 'whatsapp' ? 'WhatsApp Copiado!' : 'Copiar para WhatsApp'}
                    </span>
                  </button>
                </div>

                {/* Ações diretas de envio rápido */}
                <div className="flex items-center gap-2 pt-1">
                  {simEmail ? (
                    <button
                      type="button"
                      onClick={handleOpenEmailClient}
                      className="flex-1 py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-semibold rounded-lg border border-blue-500/30 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Abrir no App de E-mail</span>
                    </button>
                  ) : null}
                  {simTelefone ? (
                    <button
                      type="button"
                      onClick={handleOpenWhatsAppWeb}
                      className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold rounded-lg border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp Web</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: METAS & INDICADORES */}
      {activeTab === 'metas' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Metas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Desempenho Comercial & Metas</h3>
                <p className="text-xs text-slate-400">Acompanhamento do atingimento de metas e ranking de vendas.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={currentMesAno}
                onChange={e => setCurrentMesAno(e.target.value)}
                className="input-field text-xs py-2 bg-slate-950"
              />
              {isAdmin && (
                <button
                  onClick={() => setIsModalMetasOpen(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Ajustar Metas
                </button>
              )}
            </div>
          </div>

          {/* Metas Progress Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Meta MRR */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Meta de Novo MRR</span>
                <span className="text-xs font-bold text-emerald-400">{stats.pctMrr}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  R$ {stats.ganhoMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Meta: R$ {(stats.metaGlobal.meta_mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.pctMrr}%` }}
                ></div>
              </div>
            </div>

            {/* Meta Setup */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Meta de Receita Setup</span>
                <span className="text-xs font-bold text-blue-400">{stats.pctSetup}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  R$ {stats.ganhoSetup.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Meta: R$ {(stats.metaGlobal.meta_setup || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.pctSetup}%` }}
                ></div>
              </div>
            </div>

            {/* Meta Fechamentos */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Meta de Contratos Fechados</span>
                <span className="text-xs font-bold text-purple-400">{stats.pctQtd}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {stats.ganhasCount} clientes
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Meta: {stats.metaGlobal.meta_qtd_fechamentos || 0} clientes
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.pctQtd}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Vendas por Vendedor & Indicadores Complementares */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking por Vendedor */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Desempenho por Vendedor
              </h4>

              <div className="divide-y divide-slate-800">
                {vendedores.map(v => {
                  const vendOpps = oportunidades.filter(o => o.vendedor_id === v.id && o.estagio === 'ganho')
                  const vendMrr = vendOpps.reduce((acc, o) => acc + (o.valor_mensalidade || 0), 0)
                  const vendSetup = vendOpps.reduce((acc, o) => acc + (o.valor_setup || 0), 0)

                  return (
                    <div key={v.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center text-xs font-bold uppercase">
                          {(v.nome || v.login).charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{v.nome || v.login}</p>
                          <p className="text-[10px] text-slate-500">{vendOpps.length} vendas fechadas</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-400">
                          +R$ {vendMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Setup: R$ {vendSetup.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Origem dos Leads */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Origem das Oportunidades
              </h4>

              <div className="space-y-3">
                {ORIGENS_LEAD.map(orig => {
                  const count = oportunidades.filter(o => o.origem_lead === orig).length
                  const pct = oportunidades.length > 0 ? Math.round((count / oportunidades.length) * 100) : 0

                  return (
                    <div key={orig} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{orig}</span>
                        <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR OPORTUNIDADE */}
      {isModalOportunidadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  {editingOportunidade ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingOportunidade ? 'Editar Oportunidade' : 'Nova Oportunidade Comercial'}
                  </h3>
                  <p className="text-xs text-slate-400">Cadastre os dados de contato e interesse do cliente</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOportunidadeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOportunidade} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Empresa <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Transportes Alfa"
                    value={formNomeEmpresa}
                    onChange={e => setFormNomeEmpresa(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contato Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: Roberto Silva"
                    value={formNomeContato}
                    onChange={e => setFormNomeContato(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={formTelefone}
                    onChange={e => setFormTelefone(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>
              </div>

              {/* Estágio & Vendedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estágio do Funil</label>
                  <select
                    value={formEstagio}
                    onChange={e => setFormEstagio(e.target.value as any)}
                    className="input-field w-full text-xs py-2 cursor-pointer"
                  >
                    {ESTAGIOS_ORDEM.map(st => (
                      <option key={st} value={st}>{ESTAGIOS_CONFIG[st].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendedor Responsável</label>
                  <select
                    value={formVendedorId}
                    onChange={e => setFormVendedorId(e.target.value)}
                    className="input-field w-full text-xs py-2 cursor-pointer"
                  >
                    <option value="">-- Selecione o vendedor --</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome || v.login}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Origem do Lead</label>
                  <select
                    value={formOrigemLead}
                    onChange={e => setFormOrigemLead(e.target.value)}
                    className="input-field w-full text-xs py-2 cursor-pointer"
                  >
                    {ORIGENS_LEAD.map(or => (
                      <option key={or} value={or}>{or}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valores & Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Setup (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={formValorSetup}
                    onChange={e => setFormValorSetup(Number(e.target.value))}
                    className="input-field w-full text-xs py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mensalidade MRR (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={formValorMensalidade}
                    onChange={e => setFormValorMensalidade(Number(e.target.value))}
                    className="input-field w-full text-xs py-2 font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Cliente</label>
                  <select
                    value={formTipoCliente}
                    onChange={e => setFormTipoCliente(e.target.value as any)}
                    className="input-field w-full text-xs py-2 cursor-pointer"
                  >
                    <option value="NORMAL">Normal Mantran</option>
                    <option value="SHOPEE">Shopee 4PL</option>
                  </select>
                </div>
              </div>

              {/* Módulos de Interesse */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Módulos e Integrações de Interesse ({formModulosInteresse.length} selecionados)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {modulosDisponiveis.map(m => {
                    const isChecked = formModulosInteresse.includes(m.nome)
                    return (
                      <label
                        key={m.id}
                        className={clsx(
                          "flex items-center p-1.5 rounded-lg border text-xs cursor-pointer select-none",
                          isChecked ? "bg-cyan-500/10 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mr-1.5"
                          checked={isChecked}
                          onChange={() => {
                            setFormModulosInteresse(prev => isChecked ? prev.filter(x => x !== m.nome) : [...prev, m.nome])
                          }}
                        />
                        <span className="truncate text-[11px]">{m.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Observações & TMS Atual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">TMS / Sistema Atual</label>
                  <input
                    type="text"
                    placeholder="Ex: Concorrente Y / Planilhas"
                    value={formTmsAtual}
                    onChange={e => setFormTmsAtual(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Previsão de Fechamento</label>
                  <input
                    type="date"
                    value={formDataPrevisao}
                    onChange={e => setFormDataPrevisao(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Observações da Negociação</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes adicionais combinados com o cliente..."
                  value={formObservacoes}
                  onChange={e => setFormObservacoes(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOportunidadeOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  {modalSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingOportunidade ? 'Salvar Alterações' : 'Cadastrar Oportunidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOTIVO DE PERDA */}
      {oportunidadeToLose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Marcar como Negociação Perdida</h3>
              <p className="text-xs text-slate-400 mt-1">
                Informe o motivo da perda para a oportunidade <strong>"{oportunidadeToLose.nome_empresa}"</strong>:
              </p>
            </div>

            <textarea
              rows={3}
              placeholder="Ex: Preço alto, optou por continuar com sistema atual, sem orçamento no momento..."
              value={motivoPerdaTexto}
              onChange={e => setMotivoPerdaTexto(e.target.value)}
              className="input-field w-full text-xs p-3 text-left"
              autoFocus
            />

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOportunidadeToLose(null)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLose}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR METAS DO MÊS */}
      {isModalMetasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Definir Metas do Mês ({currentMesAno})
              </h3>
              <button onClick={() => setIsModalMetasOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveMeta} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meta de Novo MRR (R$/mês)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={metaMrrInput}
                  onChange={e => setMetaMrrInput(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meta de Receita Setup (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={metaSetupInput}
                  onChange={e => setMetaSetupInput(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 font-bold text-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meta de Quantidade de Clientes</label>
                <input
                  type="number"
                  min="1"
                  value={metaQtdInput}
                  onChange={e => setMetaQtdInput(Number(e.target.value))}
                  className="input-field w-full text-xs py-2 font-bold text-purple-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalMetasOpen(false)} className="btn-secondary text-xs">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Salvar Metas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Implantação Direta */}
      {isNovaImplantacaoOpen && (
        <NovaImplantacaoModal
          isOpen={isNovaImplantacaoOpen}
          onClose={() => setIsNovaImplantacaoOpen(false)}
          onSuccess={() => {
            setIsNovaImplantacaoOpen(false)
            showToast('Implantação iniciada com sucesso a partir da venda!')
            loadAllData(true)
          }}
        />
      )}
    </div>
  )
}
