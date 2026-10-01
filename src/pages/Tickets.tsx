import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  ArrowLeft,
  Send,
  StickyNote,
  Paperclip,
  X,
  Loader2,
  User,
  Clock,
  AlertCircle,
  Download,
  ArrowUp,
  ArrowDown,
  Edit3,
  Forward,
  Mail,
  LayoutDashboard,
  Users,
  Settings,
  SlidersHorizontal,
  ChevronLeft,
  Trash2,
  Loader2 as Spinner
} from 'lucide-react'
import clsx from 'clsx'
import {
  api,
  type Ticket,
  type TicketMensagem,
  type TicketAnexo,
  type TicketContato,
  type ConfigEmail,
  type UsuarioSistema
} from '../lib/api'
import { getLoggedUser, isClienteUser } from '../lib/auth'
import { ContatoModal } from '../components/ContatoModal'
import { RichTextEditor } from '../components/RichTextEditor'

const STATUS_OPTIONS = ['Novo', 'Aberto', 'Pendente', 'Aguardando cliente', 'Aguardando terceiros', 'Resolvido', 'Fechado']
const PRIORIDADE_OPTIONS = ['Baixa', 'Média', 'Alta', 'Urgente']

// Verifica se um HTML contém texto real (ignora tags vazias como <p></p> ou <br>)
function htmlTemTexto(html: string): boolean {
  if (!html) return false
  const semTags = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return semTags.length > 0
}

// Sanitização básica de HTML antes de renderizar (remove scripts, handlers e URLs perigosas)
function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return html.replace(/<\/?(script|iframe|object|embed)[^>]*>/gi, '')
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const val = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      if ((name === 'href' || name === 'src') && (val.startsWith('javascript:') || val.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

// Cores dos status (tema claro estilo Freshdesk)
const STATUS_CLASSES_LIGHT: Record<string, string> = {
  'Novo': 'bg-brand-50 text-brand-700 border-brand-200',
  'Aberto': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pendente': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aguardando cliente': 'bg-orange-50 text-orange-700 border-orange-200',
  'Aguardando terceiros': 'bg-purple-50 text-purple-700 border-purple-200',
  'Resolvido': 'bg-teal-50 text-teal-700 border-teal-200',
  'Fechado': 'bg-slate-100 text-slate-600 border-slate-300'
}

const PRIORIDADE_DOT: Record<string, string> = {
  'Baixa': 'bg-emerald-400',
  'Média': 'bg-amber-400',
  'Alta': 'bg-orange-400',
  'Urgente': 'bg-red-500'
}

function formatDataHora(iso?: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

function tempoRelativo(iso?: string | null): string {
  if (!iso) return ''
  try {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `há ${diffMin} min`
    const h = Math.floor(diffMin / 60)
    if (h < 24) return `há ${h}h`
    const d = Math.floor(h / 24)
    return `há ${d} dia${d > 1 ? 's' : ''}`
  } catch {
    return ''
  }
}

export function Tickets() {
  // Portal do cliente: se logou com o próprio e-mail, mostra só os chamados dele
  const usuarioLogado = getLoggedUser()
  if (isClienteUser() && usuarioLogado?.cliente_email) {
    return <ClientePortalTickets email={usuarioLogado.cliente_email} nome={usuarioLogado.nome || usuarioLogado.login} />
  }
  return <TicketsAgente />
}

function TicketsAgente() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS')
  const [agenteFiltro, setAgenteFiltro] = useState<string>('TODOS')
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>('TODAS')
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('TODOS') // TODOS | HOJE | 7 | 30
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS')
  const [classificacaoFiltro, setClassificacaoFiltro] = useState<string>('TODAS')
  const [grupoFiltro, setGrupoFiltro] = useState<string>('TODOS')
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string>('TODOS')
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('TODAS')
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('TODOS')
  const [novoAberto, setNovoAberto] = useState(false)
  // Barra flutuante de navegação (estilo Freshdesk): view atual + expandido
  const [view, setView] = useState<'painel' | 'tickets' | 'contatos' | 'admin'>('tickets')
  const [railAberto, setRailAberto] = useState(false)
  const [agentes, setAgentes] = useState<UsuarioSistema[]>([])
  const [tecnicos, setTecnicos] = useState<UsuarioSistema[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [contatos, setContatos] = useState<any[]>([])
  const [emailsFuncionarios, setEmailsFuncionarios] = useState<string[]>([])

  // Ordenação
  const [ordenarPor, setOrdenarPor] = useState<'created_at' | 'updated_at' | 'prioridade' | 'status'>('created_at')
  const [ordemDesc, setOrdemDesc] = useState(true)

  // Paginação
  const [porPagina, setPorPagina] = useState(30)
  const [pagina, setPagina] = useState(1)

  // Cadastros auxiliares
  const [cadastros, setCadastros] = useState<{ tipos: any[]; classificacoes: any[]; grupos: any[]; departamentos: any[] }>({ tipos: [], classificacoes: [], grupos: [], departamentos: [] })

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await api.getTickets()
      setTickets(data)
    } catch (err) {
      console.error('Erro ao carregar tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    // Agentes = perfil Suporte ou Administrador
    api.getUsuariosAgentes().then(us => setAgentes(us as UsuarioSistema[])).catch(() => {})
    // Técnicos = perfil Técnico
    api.getUsuariosTecnicos().then(us => setTecnicos(us as UsuarioSistema[])).catch(() => {})
    // Empresas = clientes cadastrados
    api.getClientes().then(cs => setClientes(cs || [])).catch(() => {})
    // Contatos (para exibir a empresa vinculada nos cards)
    api.getContatos().then(cs => setContatos(cs || [])).catch(() => {})
    // Cadastros auxiliares (tipos, classificações, grupos, departamentos)
    api.getTicketCadastros().then(setCadastros).catch(() => {})
    // E-mails corporativos dos funcionários (classificação "Mantran")
    api.getEmailsFuncionarios().then(es => setEmailsFuncionarios(es)).catch(() => {})
  }, [])

  const ticketsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const agora = Date.now()
    return tickets.filter(t => {
      if (statusFiltro !== 'TODOS' && t.status !== statusFiltro) return false
      if (agenteFiltro !== 'TODOS') {
        if (agenteFiltro === 'SEM_AGENTE' ? !!t.agente_nome : t.agente_nome !== agenteFiltro) return false
      }
      if (prioridadeFiltro !== 'TODAS' && t.prioridade !== prioridadeFiltro) return false
      if (tipoFiltro !== 'TODOS' && t.tipo_id !== tipoFiltro) return false
      if (classificacaoFiltro !== 'TODAS') {
        // Segue a MESMA regra da tela de Contatos: a classificação vem do contato do
        // ticket -> empresa_id -> tipo do cliente. Exceção: se o e-mail for de um
        // funcionário da Mantran (email_corporativo), a classificação é "Mantran".
        const email = (t.cliente_email || '').trim().toLowerCase()
        const nome = (t.cliente_nome || '').trim().toLowerCase()
        const ct = contatos.find(c =>
          (t.contato_id && c.id === t.contato_id) ||
          (email && (c.email || '').toLowerCase() === email) ||
          (nome && (c.nome || '').toLowerCase() === nome)
        )
        const emailContato = (ct?.email || email || '').trim().toLowerCase()
        let tipoCli: string
        if (emailContato && emailsFuncionarios.includes(emailContato)) {
          tipoCli = 'Mantran'
        } else {
          const empresaId = ct?.empresa_id || null
          tipoCli = empresaId ? (clientes.find(c => c.id === empresaId)?.tipo || '') : ''
        }
        if (tipoCli.trim().toLowerCase() !== classificacaoFiltro.trim().toLowerCase()) return false
      }
      if (grupoFiltro !== 'TODOS' && t.grupo_id !== grupoFiltro) return false
      if (departamentoFiltro !== 'TODOS' && t.departamento_id !== departamentoFiltro) return false
      if (empresaFiltro !== 'TODAS') {
        const alvo = empresaFiltro.trim().toLowerCase()
        if (!t.cliente_nome || !t.cliente_nome.toLowerCase().includes(alvo)) return false
      }
      if (tecnicoFiltro !== 'TODOS') {
        if (tecnicoFiltro === 'SEM_TECNICO' ? !!t.tecnico_nome : t.tecnico_nome !== tecnicoFiltro) return false
      }
      if (periodoFiltro !== 'TODOS' && t.created_at) {
        const dias = (agora - new Date(t.created_at).getTime()) / 86400000
        if (periodoFiltro === 'HOJE' && dias > 1) return false
        if (periodoFiltro === '7' && dias > 7) return false
        if (periodoFiltro === '30' && dias > 30) return false
      }
      if (!termo) return true
      return (
        t.titulo?.toLowerCase().includes(termo) ||
        t.cliente_nome?.toLowerCase().includes(termo) ||
        String(t.numero).includes(termo)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, busca, statusFiltro, agenteFiltro, prioridadeFiltro, periodoFiltro, tipoFiltro, classificacaoFiltro, grupoFiltro, departamentoFiltro, empresaFiltro, tecnicoFiltro, clientes, contatos, emailsFuncionarios])

  // Ordenação da lista já filtrada
  const ticketsOrdenados = useMemo(() => {
    const prioridadeRank: Record<string, number> = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 }
    const statusRank: Record<string, number> = {
      'Novo': 7, 'Aberto': 6, 'Pendente': 5, 'Aguardando cliente': 4,
      'Aguardando terceiros': 3, 'Resolvido': 2, 'Fechado': 1
    }
    const arr = [...ticketsFiltrados]
    arr.sort((a, b) => {
      let cmp = 0
      if (ordenarPor === 'created_at') {
        cmp = (a.created_at || '').localeCompare(b.created_at || '')
      } else if (ordenarPor === 'updated_at') {
        cmp = (a.updated_at || '').localeCompare(b.updated_at || '')
      } else if (ordenarPor === 'prioridade') {
        cmp = (prioridadeRank[a.prioridade] || 0) - (prioridadeRank[b.prioridade] || 0)
      } else if (ordenarPor === 'status') {
        cmp = (statusRank[a.status] || 0) - (statusRank[b.status] || 0)
      }
      return ordemDesc ? -cmp : cmp
    })
    return arr
  }, [ticketsFiltrados, ordenarPor, ordemDesc])

  // Paginação: total, páginas e fatia atual
  const totalRegistros = ticketsOrdenados.length
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * porPagina
  const ticketsPagina = ticketsOrdenados.slice(inicio, inicio + porPagina)

  // Volta para a página 1 ao mudar filtros, busca, ordenação ou itens por página
  useEffect(() => {
    setPagina(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, statusFiltro, agenteFiltro, prioridadeFiltro, periodoFiltro, tipoFiltro, classificacaoFiltro, grupoFiltro, departamentoFiltro, empresaFiltro, tecnicoFiltro, ordenarPor, ordemDesc, porPagina])

  const filtrosAtivos = [
    statusFiltro !== 'TODOS',
    agenteFiltro !== 'TODOS',
    prioridadeFiltro !== 'TODAS',
    periodoFiltro !== 'TODOS',
    tipoFiltro !== 'TODOS',
    classificacaoFiltro !== 'TODAS',
    grupoFiltro !== 'TODOS',
    departamentoFiltro !== 'TODOS',
    empresaFiltro !== 'TODAS',
    tecnicoFiltro !== 'TODOS'
  ].filter(Boolean).length

  const limparFiltros = () => {
    setStatusFiltro('TODOS')
    setAgenteFiltro('TODOS')
    setPrioridadeFiltro('TODAS')
    setPeriodoFiltro('TODOS')
    setTipoFiltro('TODOS')
    setClassificacaoFiltro('TODAS')
    setGrupoFiltro('TODOS')
    setDepartamentoFiltro('TODOS')
    setEmpresaFiltro('TODAS')
    setTecnicoFiltro('TODOS')
  }



  const naoResolvidos = tickets.filter(t => t.status !== 'Resolvido' && t.status !== 'Fechado').length

  // Mapa contato_id -> nome da empresa (via cliente vinculado ou empresa_nome livre)
  const empresaPorContato = useMemo(() => {
    const mapa = new Map<string, string>()
    contatos.forEach(ct => {
      const nome = ct.empresa_id
        ? (clientes.find(c => c.id === ct.empresa_id)?.nome_empresa || ct.empresa_nome)
        : ct.empresa_nome
      if (nome) mapa.set(ct.id, nome)
    })
    return mapa
  }, [contatos, clientes])

  // Retorna o nome da empresa a exibir para um ticket (se houver contato com empresa)
  const empresaDoTicket = (t: Ticket): string | null => {
    if (t.contato_id && empresaPorContato.has(t.contato_id)) return empresaPorContato.get(t.contato_id)!
    return null
  }

  // Valores distintos de "tipo" dos clientes + "Mantran" (funcionários) para o filtro Classificação
  const classificacoesCliente = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach(c => { if (c.tipo) set.add(c.tipo) })
    if (emailsFuncionarios.length) set.add('Mantran')
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [clientes, emailsFuncionarios])

  // Altera a prioridade direto no card da lista (sem abrir o chamado)
  const atualizarPrioridade = async (ticketId: string, novaPrioridade: string) => {
    const anterior = tickets.find(t => t.id === ticketId)?.prioridade
    if (anterior === novaPrioridade) return
    // Atualização otimista
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, prioridade: novaPrioridade } : t))
    try {
      await api.updateTicket(ticketId, { prioridade: novaPrioridade })
    } catch (err) {
      console.error('Erro ao atualizar prioridade:', err)
      // Reverte em caso de erro
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, prioridade: anterior || t.prioridade } : t))
      alert('Não foi possível atualizar a prioridade.')
    }
  }

  // Exporta os tickets filtrados/ordenados para Excel
  const exportar = async () => {
    try {
      const XLSX = await import('xlsx')
      const linhas = ticketsOrdenados.map(t => ({
        'Número': t.numero,
        'Assunto': t.titulo,
        'Cliente': t.cliente_nome || '',
        'E-mail': t.cliente_email || '',
        'Status': t.status,
        'Prioridade': t.prioridade,
        'Agente': t.agente_nome || '',
        'Responsável Técnico': t.tecnico_nome || '',
        'Origem': t.origem,
        'Criado em': t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '',
        'Atualizado em': t.updated_at ? new Date(t.updated_at).toLocaleString('pt-BR') : ''
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
      XLSX.writeFile(wb, `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Erro ao exportar tickets:', err)
      alert('Erro ao exportar os tickets.')
    }
  }

  if (novoAberto) {
    return (
      <NovoTicketTela
        agentes={agentes}
        tecnicos={tecnicos}
        clientes={clientes}
        contatos={contatos}
        cadastros={cadastros}
        onVoltar={() => setNovoAberto(false)}
        onCreated={() => { setNovoAberto(false); fetchTickets() }}
      />
    )
  }

  if (selecionadoId) {
    return (
      <TicketDetalhe
        ticketId={selecionadoId}
        agentes={agentes}
        tecnicos={tecnicos}
        clientes={clientes}
        contatos={contatos}
        emailsFuncionarios={emailsFuncionarios}
        cadastros={cadastros}
        onVoltar={() => { setSelecionadoId(null); fetchTickets() }}
        onChange={fetchTickets}
      />
    )
  }

  return (
    <div className="text-slate-800 h-full flex flex-col min-h-0 relative">
      {/* Barra flutuante de navegação (estilo Freshdesk) */}
      <TicketsNavRail
        aberto={railAberto}
        onToggle={() => setRailAberto(v => !v)}
        view={view}
        onSelect={v => { setView(v); setRailAberto(false) }}
      />

      {view === 'painel' ? (
        <PainelControleView tickets={tickets} agentes={agentes} loading={loading} />
      ) : view === 'contatos' ? (
        <ContatosView clientes={clientes} grupos={cadastros.grupos} emailsFuncionarios={emailsFuncionarios} onChange={() => api.getContatos().then(cs => setContatos(cs || [])).catch(() => {})} />
      ) : view === 'admin' ? (
        <AdminCadastrosView cadastros={cadastros} onChange={() => api.getTicketCadastros().then(setCadastros).catch(() => {})} />
      ) : (
      <div className={clsx(
        'w-full min-w-0 flex flex-col flex-1 min-h-0 transition-all duration-200',
        railAberto ? 'max-w-7xl mx-auto' : 'max-w-none pl-12'
      )}>
        {/* Topo fixo: header + busca */}
        <div className="shrink-0 space-y-4 pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
              <TicketIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Tickets</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">{naoResolvidos} chamado(s) em aberto</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportar}
              className="py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              className="py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Novo Ticket</span>
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por título, cliente ou número..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 shadow-sm"
          />
        </div>
        </div>
        {/* Fim do topo fixo */}

        {/* Conteúdo: lista + painel de filtros (ocupa o resto da altura, cada um com scroll próprio) */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch flex-1 min-h-0">
          {/* Lista de cards */}
          <div className="flex-1 min-w-0 w-full flex flex-col min-h-0">
            {/* Barra de ordenação (fixa acima do scroll da lista) */}
            <div className="flex items-center gap-2 mb-2.5 text-xs shrink-0">
              <span className="font-bold text-slate-500">Ordenar por:</span>
              <select
                value={ordenarPor}
                onChange={e => setOrdenarPor(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="created_at">Data de criação</option>
                <option value="updated_at">Última modificação</option>
                <option value="prioridade">Prioridade</option>
                <option value="status">Status</option>
              </select>
              <button
                type="button"
                onClick={() => setOrdemDesc(v => !v)}
                title={ordemDesc ? 'Decrescente' : 'Crescente'}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 font-semibold hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                {ordemDesc ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                {ordemDesc ? 'Descendente' : 'Ascendente'}
              </button>
              <span className="ml-auto text-slate-400">
                {ticketsOrdenados.length === tickets.length
                  ? `${tickets.length} ticket(s)`
                  : `${ticketsOrdenados.length} de ${tickets.length} tickets`}
              </span>
            </div>

            {/* Área rolável dos cards */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-clean">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando tickets...</div>
            ) : ticketsFiltrados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-2 shadow-sm">
                <TicketIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">Nenhum ticket encontrado</h3>
                <p className="text-xs text-slate-400">Crie um novo ticket ou ajuste os filtros.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ticketsPagina.map(t => {
                  const isNovo = !t.lido
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelecionadoId(t.id)}
                      className={clsx(
                        'w-full text-left bg-white border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all hover:shadow-md hover:border-brand-300 shadow-sm cursor-pointer',
                        isNovo ? 'border-brand-200' : 'border-slate-200'
                      )}
                    >
                      {/* Avatar cliente */}
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 uppercase shrink-0">
                        {(t.cliente_nome || '?').charAt(0)}
                      </div>

                      {/* Info principal */}
                      <div className="min-w-0 flex-1">
                        {/* Tags no topo do card */}
                        {t.tags && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {t.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isNovo && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 border border-brand-200">
                              Novo
                            </span>
                          )}
                          <span
                            title={t.titulo}
                            className={clsx('text-sm truncate', isNovo ? 'font-black text-slate-900' : 'font-semibold text-slate-700')}
                          >
                            {t.titulo}
                          </span>
                          <span className="text-xs font-bold text-brand-600 font-mono shrink-0">#{t.numero}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="truncate">
                            {t.cliente_nome || 'Sem cliente'}
                            {empresaDoTicket(t) && <span className="text-slate-400"> ({empresaDoTicket(t)})</span>}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{tempoRelativo(t.created_at)}</span>
                        </div>
                      </div>

                      {/* Lado direito: prioridade, agente, status */}
                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-[11px]">
                        <span
                          className="flex items-center gap-1.5 text-slate-500 rounded-md hover:bg-slate-100 pl-1.5 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className={clsx('w-2 h-2 rounded-full shrink-0', PRIORIDADE_DOT[t.prioridade] || 'bg-slate-400')} />
                          <select
                            value={t.prioridade}
                            onChange={e => atualizarPrioridade(t.id, e.target.value)}
                            title="Alterar prioridade"
                            className="bg-transparent text-[11px] text-slate-500 font-medium focus:outline-none cursor-pointer py-0.5 pr-1 -ml-0.5 rounded"
                          >
                            {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <User className="w-3 h-3" />
                          {t.agente_nome || 'Sem agente'}
                        </span>
                      </div>
                      <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0', STATUS_CLASSES_LIGHT[t.status] || 'bg-slate-100 text-slate-600 border-slate-300')}>
                        {t.status}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            </div>
            {/* Fim da área rolável dos cards */}

            {/* Paginação (fixa no rodapé da lista) */}
            {!loading && totalRegistros > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-1 text-xs shrink-0 border-t border-slate-200">
                <div className="flex items-center gap-2 text-slate-500">
                  <span>Mostrando</span>
                  <select
                    value={porPagina}
                    onChange={e => setPorPagina(Number(e.target.value))}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value={30}>30 / página</option>
                    <option value={50}>50 / página</option>
                    <option value={100}>100 / página</option>
                  </select>
                  <span>
                    {inicio + 1}–{Math.min(inicio + porPagina, totalRegistros)} de {totalRegistros}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - paginaAtual) <= 1)
                    .reduce((acc: (number | '...')[], n, idx, arr) => {
                      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...')
                      acc.push(n)
                      return acc
                    }, [])
                    .map((n, i) => n === '...' ? (
                      <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPagina(n as number)}
                        className={clsx(
                          'w-8 h-8 flex items-center justify-center rounded-lg border font-bold transition-colors',
                          n === paginaAtual
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Painel de Filtros (estilo Freshdesk) — scroll próprio */}
          <aside className="w-full lg:w-72 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 lg:self-stretch lg:overflow-y-auto scrollbar-clean">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Filtros</h3>
              {filtrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  Limpar ({filtrosAtivos})
                </button>
              )}
            </div>

            <div className="space-y-3.5">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                <select
                  value={statusFiltro}
                  onChange={e => setStatusFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer status</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Agente */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Agente</label>
                <select
                  value={agenteFiltro}
                  onChange={e => setAgenteFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer agente</option>
                  <option value="SEM_AGENTE">⚠️ Sem agente</option>
                  {agentes.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Prioridade</label>
                <select
                  value={prioridadeFiltro}
                  onChange={e => setPrioridadeFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODAS">Qualquer prioridade</option>
                  {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Responsável Técnico */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Responsável (Técnico)</label>
                <select
                  value={tecnicoFiltro}
                  onChange={e => setTecnicoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer técnico</option>
                  <option value="SEM_TECNICO">⚠️ Sem técnico</option>
                  {tecnicos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
              </div>

              {/* Empresa (Cliente) — autocomplete */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Empresa</label>
                <input
                  type="text"
                  list="lista-empresas-filtro"
                  value={empresaFiltro === 'TODAS' ? '' : empresaFiltro}
                  onChange={e => setEmpresaFiltro(e.target.value.trim() === '' ? 'TODAS' : e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />
                <datalist id="lista-empresas-filtro">
                  {clientes.map(c => <option key={c.id} value={c.nome_empresa} />)}
                </datalist>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo</label>
                <select
                  value={tipoFiltro}
                  onChange={e => setTipoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer tipo</option>
                  {cadastros.tipos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Classificação */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Classificação Cliente</label>
                <select
                  value={classificacaoFiltro}
                  onChange={e => setClassificacaoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODAS">Qualquer classificação</option>
                  {classificacoesCliente.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Grupo</label>
                <select
                  value={grupoFiltro}
                  onChange={e => setGrupoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer grupo</option>
                  {cadastros.grupos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Departamento</label>
                <select
                  value={departamentoFiltro}
                  onChange={e => setDepartamentoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">Qualquer departamento</option>
                  {cadastros.departamentos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Criado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Criado</label>
                <select
                  value={periodoFiltro}
                  onChange={e => setPeriodoFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODOS">A qualquer momento</option>
                  <option value="HOJE">Hoje</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                </select>
              </div>


            </div>
          </aside>
        </div>
      </div>
      )}

    </div>
  )
}

// ============================================================
// Portal do Cliente: vê e responde apenas os próprios chamados
// ============================================================
function ClientePortalTickets({ email, nome }: { email: string; nome: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  // Formulário de novo chamado
  const [novoAssunto, setNovoAssunto] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await api.getTicketsDoCliente(email)
      setTickets(data)
    } catch (err) {
      console.error('Erro ao carregar meus chamados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [email])

  const criarChamado = async () => {
    if (!novoAssunto.trim()) { alert('Informe o assunto do chamado.'); return }
    if (!novoDescricao.trim()) { alert('Descreva o seu chamado.'); return }
    setSalvandoNovo(true)
    try {
      const novo = await api.createTicket({
        titulo: novoAssunto.trim(),
        descricao: novoDescricao.trim(),
        cliente_nome: nome || email,
        cliente_email: email,
        origem: 'portal_cliente',
        status: 'Novo',
        prioridade: 'Média'
      })
      // Notifica os agentes do sistema
      await api.createNotificacao({
        titulo: `🎫 Novo chamado de ${nome || email}`,
        mensagem: `${nome || email} abriu um chamado pelo portal: "${novoAssunto.trim()}".`,
        tipo: 'ticket'
      }).catch(() => {})
      // Envia confirmação de abertura ao cliente (com o número do chamado)
      if (novo?.numero) {
        const assuntoConf = `[#${novo.numero}] ${novoAssunto.trim()}`
        const htmlConf = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;line-height:1.6;max-width:600px">
            <p>Olá,</p>
            <p>Recebemos a sua solicitação e abrimos o chamado abaixo. Nossa equipe irá atendê-lo em breve.</p>
            <div style="margin:20px 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
              <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:bold">Número do chamado</p>
              <p style="margin:0;font-size:20px;font-weight:bold;color:#dc2626">#${novo.numero}</p>
              <p style="margin:8px 0 0;font-size:14px;color:#334155">${novoAssunto.trim()}</p>
            </div>
            <p style="font-size:13px;color:#64748b">Guarde este número para acompanhar o seu atendimento. Você pode responder a este e-mail (mantendo o assunto com o #${novo.numero}) para dar continuidade.</p>
          </div>`
        api.enviarEmail({
          para: email,
          assunto: assuntoConf,
          html: htmlConf,
          texto: `Recebemos a sua solicitação e abrimos o chamado #${novo.numero} - ${novoAssunto.trim()}. Guarde este número para acompanhar o atendimento.`
        }).catch(() => {})
      }
      setNovoAssunto('')
      setNovoDescricao('')
      setNovoAberto(false)
      await carregar()
      alert('Chamado aberto com sucesso! Nossa equipe irá atendê-lo em breve.')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao abrir o chamado: ' + (err.message || 'Desconhecido'))
    } finally {
      setSalvandoNovo(false)
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return tickets
    return tickets.filter(t =>
      (t.titulo || '').toLowerCase().includes(termo) ||
      String(t.numero).includes(termo)
    )
  }, [tickets, busca])

  if (selecionadoId) {
    return (
      <ClientePortalDetalhe
        ticketId={selecionadoId}
        clienteNome={nome}
        clienteEmail={email}
        onVoltar={() => { setSelecionadoId(null); carregar() }}
      />
    )
  }

  return (
    <div className="text-slate-800 h-full flex flex-col min-h-0">
      <div className="max-w-4xl mx-auto w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Topo */}
        <div className="shrink-0 space-y-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
                <TicketIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Meus Chamados</h1>
                <p className="text-[11px] sm:text-xs text-slate-500">{tickets.length} chamado(s) · {email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              className="py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Abrir Chamado</span>
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por título ou número..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 shadow-sm"
            />
          </div>
        </div>

        {/* Modal Novo Chamado */}
        {novoAberto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setNovoAberto(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600">
                    <TicketIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800">Abrir novo chamado</h2>
                    <p className="text-[11px] text-slate-500">Descreva sua solicitação e nossa equipe irá atendê-lo</p>
                  </div>
                </div>
                <button type="button" onClick={() => setNovoAberto(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assunto <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={novoAssunto}
                    onChange={e => setNovoAssunto(e.target.value)}
                    placeholder="Ex: Erro ao emitir nota fiscal"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição <span className="text-red-500">*</span></label>
                  <textarea
                    value={novoDescricao}
                    onChange={e => setNovoDescricao(e.target.value)}
                    placeholder="Descreva o que está acontecendo com o máximo de detalhes..."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500 resize-y"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setNovoAberto(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors cursor-pointer">
                    Cancelar
                  </button>
                  <button type="button" onClick={criarChamado} disabled={salvandoNovo} className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer">
                    {salvandoNovo ? 'Abrindo...' : 'Abrir chamado'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-clean">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando seus chamados...</div>
          ) : filtrados.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-2 shadow-sm">
              <TicketIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Nenhum chamado encontrado</h3>
              <p className="text-xs text-slate-400">Você ainda não possui chamados registrados.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtrados.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelecionadoId(t.id)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all hover:shadow-md hover:border-brand-300 shadow-sm cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 truncate">{t.titulo}</span>
                      <span className="text-xs font-bold text-brand-600 font-mono shrink-0">#{t.numero}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tempoRelativo(t.created_at)}</span>
                    </div>
                  </div>
                  <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0', STATUS_CLASSES_LIGHT[t.status] || 'bg-slate-100 text-slate-600 border-slate-300')}>
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Detalhe do chamado na visão do cliente (só ver e responder; sem ferramentas de agente / anotações internas)
function ClientePortalDetalhe({ ticketId, clienteNome, clienteEmail, onVoltar }: {
  ticketId: string
  clienteNome: string
  clienteEmail: string
  onVoltar: () => void
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [mensagens, setMensagens] = useState<TicketMensagem[]>([])
  const [anexos, setAnexos] = useState<TicketAnexo[]>([])
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await api.getTicketById(ticketId)
      setTicket(data)
      // Cliente NÃO vê anotações internas
      setMensagens((data.mensagens || []).filter(m => m.tipo !== 'anotacao'))
      setAnexos(data.anexos || [])
    } catch (err) {
      console.error('Erro ao carregar chamado:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [ticketId])

  const anexosDoTicket = anexos.filter(a => !a.mensagem_id)
  const anexosDaMensagem = (msgId: string) => anexos.filter(a => a.mensagem_id === msgId)

  const enviar = async () => {
    if (!texto.trim()) { alert('Escreva sua mensagem.'); return }
    setEnviando(true)
    try {
      await api.addTicketMensagem({
        ticket_id: ticketId,
        tipo: 'cliente',
        conteudo: texto.trim(),
        autor_nome: clienteNome || clienteEmail,
        autor_tipo: 'cliente'
      })
      // Notifica os agentes que o cliente respondeu
      if (ticket) {
        await api.createNotificacao({
          titulo: `💬 Resposta do cliente no #${ticket.numero}`,
          mensagem: `${clienteNome || clienteEmail} respondeu no chamado "${ticket.titulo}".`,
          tipo: 'ticket'
        }).catch(() => {})
      }
      setTexto('')
      await carregar()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao enviar: ' + (err.message || 'Desconhecido'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="text-slate-800 h-full flex flex-col min-h-0">
      <div className="max-w-4xl mx-auto w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Cabeçalho */}
        <div className="shrink-0 flex items-center gap-3 pb-4">
          <button type="button" onClick={onVoltar} className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-400 transition-colors cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">{ticket?.titulo || 'Chamado'}</h1>
            {ticket && (
              <p className="text-[11px] text-slate-500">
                #{ticket.numero} · <span className={clsx('font-semibold', 'px-1.5 py-0.5 rounded border', STATUS_CLASSES_LIGHT[ticket.status] || 'bg-slate-100 text-slate-600 border-slate-300')}>{ticket.status}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-clean space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando...</div>
          ) : (
            <>
              {/* Descrição inicial */}
              {ticket?.descricao && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-800">{ticket.cliente_nome || 'Você'}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">{formatDataHora(ticket.created_at)}</span>
                  </div>
                  {/^\s*<[a-z][\s\S]*>/i.test(ticket.descricao || '') ? (
                    <div className="rte-content text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ticket.descricao || '') }} />
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.descricao}</p>
                  )}
                  {anexosDoTicket.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">{anexosDoTicket.map(a => <AnexoChip key={a.id} anexo={a} />)}</div>
                  )}
                </div>
              )}

              {/* Thread (sem anotações internas) */}
              {mensagens.map(m => {
                const doCliente = m.autor_tipo === 'cliente'
                return (
                  <div key={m.id} className={clsx('rounded-2xl p-4 border shadow-sm', doCliente ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200')}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-800">{doCliente ? (m.autor_nome || 'Você') : 'Suporte Mantran'}</span>
                      <span className="text-[11px] text-slate-400 ml-auto">{formatDataHora(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.conteudo}</p>
                    {anexosDaMensagem(m.id).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">{anexosDaMensagem(m.id).map(a => <AnexoChip key={a.id} anexo={a} />)}</div>
                    )}
                  </div>
                )
              })}

              {/* Responder (só para chamados não fechados) */}
              {ticket && ticket.status !== 'Fechado' ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-2 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-brand-700 px-2">Responder</span>
                  </div>
                  <div className="p-3">
                    <textarea
                      value={texto}
                      onChange={e => setTexto(e.target.value)}
                      placeholder="Escreva sua resposta ao suporte..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500 resize-y"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={enviar}
                        disabled={enviando || !texto.trim()}
                        className="py-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> {enviando ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-500">
                  Este chamado está fechado. Para uma nova solicitação, envie um e-mail para o suporte.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Barra flutuante de navegação (estilo Freshdesk)
// ============================================================
function TicketsNavRail({ aberto, onToggle, view, onSelect }: {
  aberto: boolean
  onToggle: () => void
  view: 'painel' | 'tickets' | 'contatos' | 'admin'
  onSelect: (v: 'painel' | 'tickets' | 'contatos' | 'admin') => void
}) {
  const itens: { key: string; label: string; icon: any; target: 'painel' | 'tickets' | 'contatos' | 'admin' }[] = [
    { key: 'painel', label: 'Painel de Controle', icon: LayoutDashboard, target: 'painel' },
    { key: 'tickets', label: 'Tickets', icon: TicketIcon, target: 'tickets' },
    { key: 'contatos', label: 'Contatos', icon: Users, target: 'contatos' },
    { key: 'admin', label: 'Admin', icon: Settings, target: 'admin' }
  ]

  return (
    <>
      {/* Botão flutuante (visível quando recolhido) */}
      {!aberto && (
        <button
          type="button"
          onClick={onToggle}
          title="Abrir navegação"
          className="absolute left-0 top-24 z-30 flex items-center justify-center w-9 h-10 rounded-r-xl bg-brand-600 hover:bg-brand-700 text-white shadow-lg transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* Painel expandido */}
      {aberto && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div className="absolute inset-0 z-30 bg-slate-900/5" onClick={onToggle} />
          <div className="absolute left-0 top-16 z-40 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 animate-[fadeIn_.12s_ease-out]">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Navegação</span>
              <button
                type="button"
                onClick={onToggle}
                title="Recolher"
                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {itens.map(it => {
                const ativo = view === it.target
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => onSelect(it.target)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer',
                      ativo
                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    )}
                  >
                    <it.icon className={clsx('w-4 h-4 shrink-0', ativo ? 'text-brand-600' : 'text-slate-400')} />
                    <span>{it.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ============================================================
// View: Painel de Controle (dashboard)
// ============================================================
function PainelControleView({ tickets, agentes, loading }: {
  tickets: Ticket[]
  agentes: UsuarioSistema[]
  loading: boolean
}) {
  // Considera "fechado" os status Fechado e Resolvido
  const isFechado = (s: string) => s === 'Fechado' || s === 'Resolvido'

  const resumo = useMemo(() => {
    const naoResolvidos = tickets.filter(t => !isFechado(t.status)).length
    const abertos = tickets.filter(t => t.status === 'Aberto').length
    const emEspera = tickets.filter(t => t.status === 'Pendente' || t.status === 'Aguardando cliente' || t.status === 'Aguardando terceiros').length
    const naoAtribuido = tickets.filter(t => !t.agente_id && !t.agente_nome).length
    const resolvidos = tickets.filter(t => t.status === 'Resolvido').length
    const fechados = tickets.filter(t => t.status === 'Fechado').length
    return { total: tickets.length, naoResolvidos, abertos, emEspera, naoAtribuido, resolvidos, fechados }
  }, [tickets])

  // Tickets fechados agrupados por agente
  const fechadosPorAgente = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number }>()
    tickets.filter(t => isFechado(t.status)).forEach(t => {
      const chave = t.agente_id || t.agente_nome || '__sem__'
      const nome = t.agente_nome || 'Sem agente'
      const atual = mapa.get(chave)
      if (atual) atual.qtd += 1
      else mapa.set(chave, { nome, qtd: 1 })
    })
    // Garante que agentes sem tickets fechados também apareçam com 0
    agentes.forEach(a => {
      if (!mapa.has(a.id) && !Array.from(mapa.values()).some(v => v.nome === a.nome)) {
        mapa.set(a.id, { nome: a.nome, qtd: 0 })
      }
    })
    return Array.from(mapa.values()).sort((a, b) => b.qtd - a.qtd)
  }, [tickets, agentes])

  const maxQtd = Math.max(1, ...fechadosPorAgente.map(a => a.qtd))
  const totalFechados = resumo.resolvidos + resumo.fechados

  // Tendências: tickets criados por hora — hoje x ontem
  const tendencias = useMemo(() => {
    const hoje = new Array(24).fill(0)
    const ontem = new Array(24).fill(0)
    const agora = new Date()
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const inicioOntem = new Date(inicioHoje); inicioOntem.setDate(inicioOntem.getDate() - 1)
    const fimOntem = new Date(inicioHoje)

    tickets.forEach(t => {
      if (!t.created_at) return
      const d = new Date(t.created_at)
      if (d >= inicioHoje) hoje[d.getHours()] += 1
      else if (d >= inicioOntem && d < fimOntem) ontem[d.getHours()] += 1
    })
    return { hoje, ontem, totalHoje: hoje.reduce((a, b) => a + b, 0), totalOntem: ontem.reduce((a, b) => a + b, 0) }
  }, [tickets])

  const cards = [
    { label: 'Não resolvido', valor: resumo.naoResolvidos, cor: 'text-slate-900' },
    { label: 'Aberto', valor: resumo.abertos, cor: 'text-emerald-600' },
    { label: 'Em espera', valor: resumo.emEspera, cor: 'text-amber-600' },
    { label: 'Resolvidos', valor: resumo.resolvidos, cor: 'text-teal-600' },
    { label: 'Fechados', valor: resumo.fechados, cor: 'text-slate-500' },
    { label: 'Não atribuído', valor: resumo.naoAtribuido, cor: 'text-slate-900' }
  ]

  const iniciais = (nome: string) => nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <div className="max-w-none w-full min-w-0 flex flex-col flex-1 min-h-0 pl-12">
      <div className="shrink-0 flex items-center gap-3 pb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Painel de Controle</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">Visão geral dos chamados</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-clean space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando painel...</div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {cards.map(c => (
                <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">{c.label}</p>
                  <p className={clsx('text-2xl font-black', c.cor)}>{c.valor}</p>
                </div>
              ))}
            </div>

            {/* Card: Tendências de hoje (tickets entrando por hora) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-800">Tendências de hoje</h2>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 rounded-full bg-red-600" /> Hoje ({tendencias.totalHoje})
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-3 h-1 rounded-full bg-sky-300" /> Ontem ({tendencias.totalOntem})
                  </span>
                </div>
              </div>
              <TendenciasChart hoje={tendencias.hoje} ontem={tendencias.ontem} />
            </div>

            {/* Card: Tickets fechados por agente */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black text-slate-800">Tickets fechados por agente</h2>
                  <p className="text-[11px] text-slate-500">Inclui chamados Resolvidos e Fechados</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-brand-600 leading-none">{totalFechados}</p>
                  <p className="text-[11px] text-slate-500">no total</p>
                </div>
              </div>

              {fechadosPorAgente.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhum agente com tickets fechados.</p>
              ) : (
                <div className="space-y-2.5">
                  {fechadosPorAgente.map(a => (
                    <div key={a.nome} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-[11px] font-bold text-brand-600 shrink-0">
                        {iniciais(a.nome)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-40 truncate shrink-0">{a.nome}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${(a.qtd / maxQtd) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-800 w-8 text-right shrink-0">{a.qtd}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Gráfico de linha (SVG) para as tendências por hora do dia
function TendenciasChart({ hoje, ontem }: { hoje: number[]; ontem: number[] }) {
  const W = 900
  const H = 220
  const padL = 28
  const padB = 24
  const padT = 10
  const padR = 10
  const maxVal = Math.max(1, ...hoje, ...ontem)
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const x = (i: number) => padL + (i / 23) * plotW
  const y = (v: number) => padT + plotH - (v / maxVal) * plotH

  const linha = (serie: number[]) => serie.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  // Linhas de grade (0 até maxVal em passos inteiros, no máximo 4 marcações)
  const passo = Math.max(1, Math.ceil(maxVal / 4))
  const ticks: number[] = []
  for (let v = 0; v <= maxVal; v += passo) ticks.push(v)

  return (
    <div className="w-full overflow-x-auto scrollbar-clean">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" style={{ height: H }}>
        {/* Grade horizontal + eixo Y */}
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{v}</text>
          </g>
        ))}
        {/* Rótulos do eixo X (horas) */}
        {Array.from({ length: 24 }, (_, i) => i).map(i => (
          <text key={i} x={x(i)} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="#cbd5e1">{i}</text>
        ))}
        {/* Linha de ontem (fundo) */}
        <path d={linha(ontem)} fill="none" stroke="#7dd3fc" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {ontem.map((v, i) => <circle key={`o${i}`} cx={x(i)} cy={y(v)} r={2} fill="#7dd3fc" />)}
        {/* Linha de hoje (destaque) */}
        <path d={linha(hoje)} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {hoje.map((v, i) => <circle key={`h${i}`} cx={x(i)} cy={y(v)} r={2.5} fill="#dc2626" />)}
      </svg>
      <p className="text-center text-[11px] text-slate-400 mt-1">Data de criação · Hora do dia</p>
    </div>
  )
}

// ============================================================
// View: Contatos (lista + perfil)
// ============================================================
function ContatosView({ clientes, grupos, emailsFuncionarios, onChange }: {
  clientes: any[]
  grupos: any[]
  emailsFuncionarios: string[]
  onChange: () => void
}) {
  const [contatos, setContatos] = useState<TicketContato[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<TicketContato | null>(null)
  const [porPagina, setPorPagina] = useState(30)
  const [pagina, setPagina] = useState(1)

  const carregar = async () => {
    setLoading(true)
    try {
      const cs = await api.getContatos()
      setContatos(cs as TicketContato[])
    } catch (err) {
      console.error('Erro ao carregar contatos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const empresaNome = (c: TicketContato) => {
    const email = (c.email || '').trim().toLowerCase()
    if (email && emailsFuncionarios.includes(email)) return 'Mantran'
    return (c.empresa_id ? clientes.find(cl => cl.id === c.empresa_id)?.nome_empresa : null) || c.empresa_nome || ''
  }

  const grupoNome = (c: TicketContato) =>
    (c.grupo_id ? grupos.find(g => g.id === c.grupo_id)?.nome : null) || ''

  // Classificação = "Mantran" se o e-mail for de funcionário; senão, o "tipo" da empresa vinculada
  const classificacaoCliente = (c: TicketContato) => {
    const email = (c.email || '').trim().toLowerCase()
    if (email && emailsFuncionarios.includes(email)) return 'Mantran'
    return (c.empresa_id ? clientes.find(cl => cl.id === c.empresa_id)?.tipo : null) || ''
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return contatos
    return contatos.filter(c =>
      (c.nome || '').toLowerCase().includes(termo) ||
      (c.email || '').toLowerCase().includes(termo) ||
      empresaNome(c).toLowerCase().includes(termo) ||
      grupoNome(c).toLowerCase().includes(termo)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contatos, busca, clientes, grupos])

  // Volta para a página 1 ao filtrar ou mudar itens por página
  useEffect(() => { setPagina(1) }, [busca, porPagina])

  const totalRegistros = filtrados.length
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * porPagina
  const contatosPagina = filtrados.slice(inicio, inicio + porPagina)

  const exportar = async () => {
    try {
      const XLSX = await import('xlsx')
      const linhas = filtrados.map(c => ({
        'Contato': c.nome || '',
        'Classificação': classificacaoCliente(c),
        'Empresa': empresaNome(c),
        'Grupo': grupoNome(c),
        'E-mail': c.email || '',
        'E-mail secundário': c.email_secundario || '',
        'Telemóvel': c.celular || '',
        'Telefone fixo': c.telefone_comercial || ''
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Contatos')
      XLSX.writeFile(wb, `contatos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Erro ao exportar contatos:', err)
      alert('Erro ao exportar os contatos.')
    }
  }

  const COLS = 'minmax(200px,1.6fr) minmax(90px,0.8fr) minmax(180px,1.4fr) minmax(120px,1fr) minmax(200px,1.6fr) minmax(130px,1fr) minmax(130px,1fr)'

  return (
    <div className="max-w-none w-full min-w-0 flex flex-col flex-1 min-h-0 pl-12">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Contatos</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">{contatos.length} contato(s) cadastrado(s)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportar}
            className="py-2 px-3 sm:px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Exportar</span>
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail ou empresa..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 shadow-sm"
          />
        </div>
      </div>

      {/* Tabela com cabeçalho fixo e scroll interno */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-clean">
          <div className="min-w-[1040px]">
            {/* Cabeçalho (sempre visível) */}
            <div
              className="grid sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-500"
              style={{ gridTemplateColumns: COLS }}
            >
              <div className="px-4 py-3">Contato</div>
              <div className="px-4 py-3">Classificação</div>
              <div className="px-4 py-3">Empresa</div>
              <div className="px-4 py-3">Grupo</div>
              <div className="px-4 py-3">Endereço de e-mail</div>
              <div className="px-4 py-3">Telemóvel</div>
              <div className="px-4 py-3">Telefone fixo</div>
            </div>

            {/* Linhas */}
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando contatos...</div>
            ) : contatosPagina.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Nenhum contato encontrado.</div>
            ) : (
              contatosPagina.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelecionado(c)}
                  className="grid items-center border-b border-slate-100 text-sm text-slate-600 hover:bg-brand-50/40 cursor-pointer transition-colors"
                  style={{ gridTemplateColumns: COLS }}
                >
                  <div className="px-4 py-3 flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 uppercase shrink-0 overflow-hidden">
                      {c.foto_url ? <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover" /> : (c.nome || '?').charAt(0)}
                    </div>
                    <span className="font-semibold text-brand-700 truncate">{c.nome}</span>
                  </div>
                  <div className="px-4 py-3 truncate">{classificacaoCliente(c) || '- -'}</div>
                  <div className="px-4 py-3 truncate">{empresaNome(c) || '- -'}</div>
                  <div className="px-4 py-3 truncate">
                    {grupoNome(c)
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold max-w-full truncate">{grupoNome(c)}</span>
                      : '- -'}
                  </div>
                  <div className="px-4 py-3 truncate">{c.email || '- -'}</div>
                  <div className="px-4 py-3 truncate">{c.celular || '- -'}</div>
                  <div className="px-4 py-3 truncate">{c.telefone_comercial || '- -'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Paginação */}
      {!loading && totalRegistros > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-1 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Mostrando</span>
            <select
              value={porPagina}
              onChange={e => setPorPagina(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:border-brand-500"
            >
              <option value={30}>30 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
            <span>
              {inicio + 1}–{Math.min(inicio + porPagina, totalRegistros)} de {totalRegistros}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 disabled:opacity-40 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-600">{paginaAtual} / {totalPaginas}</span>
            <button
              type="button"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 disabled:opacity-40 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {selecionado && (
        <ContatoModal
          contato={selecionado}
          clientes={clientes}
          grupos={grupos}
          onClose={() => setSelecionado(null)}
          onChange={() => { carregar(); onChange() }}
        />
      )}
    </div>
  )
}

// ============================================================
// View: Admin (cadastros de tipos, classificações, grupos, departamentos)
// ============================================================
function AdminCadastrosView({ cadastros, onChange }: {
  cadastros: { tipos: any[]; classificacoes: any[]; grupos: any[]; departamentos: any[] }
  onChange: () => void
}) {
  const [abaAdmin, setAbaAdmin] = useState<'cadastros' | 'email'>('cadastros')

  const grupos = [
    { tabela: 'ticket_tipos' as const, titulo: 'Tipos', itens: cadastros.tipos },
    { tabela: 'ticket_classificacoes' as const, titulo: 'Classificações', itens: cadastros.classificacoes },
    { tabela: 'ticket_grupos' as const, titulo: 'Grupos', itens: cadastros.grupos },
    { tabela: 'ticket_departamentos' as const, titulo: 'Departamentos', itens: cadastros.departamentos }
  ]

  const tabCls = (ativo: boolean) => clsx(
    'px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5',
    ativo ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
  )

  return (
    <div className="max-w-5xl mx-auto w-full min-w-0 flex flex-col flex-1 min-h-0 pl-12">
      <div className="shrink-0 flex items-center gap-3 pb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Admin</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">Configurações e cadastros do sistema de tickets</p>
        </div>
      </div>

      {/* Abas */}
      <div className="shrink-0 flex items-center gap-2 pb-4">
        <button type="button" onClick={() => setAbaAdmin('cadastros')} className={tabCls(abaAdmin === 'cadastros')}>
          <Settings className="w-3.5 h-3.5" /> Cadastros
        </button>
        <button type="button" onClick={() => setAbaAdmin('email')} className={tabCls(abaAdmin === 'email')}>
          <Mail className="w-3.5 h-3.5" /> E-mail
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-clean">
        {abaAdmin === 'cadastros' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grupos.map(g => (
              <CadastroCard key={g.tabela} tabela={g.tabela} titulo={g.titulo} itens={g.itens} onChange={onChange} />
            ))}
          </div>
        ) : (
          <ConfigEmailForm />
        )}
      </div>
    </div>
  )
}

// Formulário de configuração de E-mail (SMTP/entrada) — Admin
function ConfigEmailForm() {
  const [cfg, setCfg] = useState<ConfigEmail>({
    id: 'default',
    smtp_host: '', smtp_porta: 587, smtp_seguranca: 'STARTTLS',
    smtp_usuario: '', smtp_senha: '',
    remetente_nome: '', remetente_email: '',
    entrada_protocolo: 'IMAP', entrada_host: '', entrada_porta: 993, entrada_ssl: true,
    ativo: false
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    api.getConfigEmail().then(c => { if (c) setCfg(prev => ({ ...prev, ...c })) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const enviarTeste = async () => {
    const destino = window.prompt('Enviar e-mail de teste para qual endereço?', cfg.remetente_email || cfg.smtp_usuario || '')
    if (!destino) return
    setEnviandoTeste(true)
    try {
      // Salva antes, para o backend usar a config atual
      await api.saveConfigEmail(cfg)
      const r = await api.enviarEmail({
        para: destino.trim(),
        assunto: 'Teste de e-mail — Mantran Tickets',
        html: '<p>Este é um <b>e-mail de teste</b> do sistema de Tickets da Mantran.</p><p>Se você recebeu esta mensagem, a configuração de SMTP está funcionando. 🎉</p>'
      })
      if (r.ok) alert('E-mail de teste enviado com sucesso! Verifique a caixa de entrada.')
      else alert('Não foi possível enviar o teste:\n\n' + (r.erro || 'erro desconhecido'))
    } finally {
      setEnviandoTeste(false)
    }
  }

  const set = <K extends keyof ConfigEmail>(campo: K, valor: ConfigEmail[K]) => setCfg(prev => ({ ...prev, [campo]: valor }))

  const salvar = async () => {
    setSalvando(true)
    try {
      await api.saveConfigEmail(cfg)
      alert('Configuração de e-mail salva com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar a configuração: ' + (err.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (loading) return <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Carregando configuração...</div>

  return (
    <div className="max-w-2xl space-y-4">
      {/* Envio (SMTP) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-black text-slate-800">Envio de e-mail (SMTP)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Servidor SMTP</label>
            <input className={inputCls} value={cfg.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} placeholder="ex: smtp.amantran.com.br" />
          </div>
          <div>
            <label className={labelCls}>Porta</label>
            <input type="number" className={inputCls} value={cfg.smtp_porta ?? ''} onChange={e => set('smtp_porta', e.target.value ? Number(e.target.value) : null)} placeholder="587" />
          </div>
          <div>
            <label className={labelCls}>Segurança</label>
            <select className={inputCls} value={cfg.smtp_seguranca || 'STARTTLS'} onChange={e => set('smtp_seguranca', e.target.value as any)}>
              <option value="STARTTLS">STARTTLS (587)</option>
              <option value="SSL">SSL/TLS (465)</option>
              <option value="NENHUMA">Nenhuma</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Usuário (e-mail)</label>
            <input className={inputCls} value={cfg.smtp_usuario || ''} onChange={e => set('smtp_usuario', e.target.value)} placeholder="nivel2@amantran.com.br" />
          </div>
          <div>
            <label className={labelCls}>Senha</label>
            <div className="relative">
              <input type={mostrarSenha ? 'text' : 'password'} className={inputCls + ' pr-10'} value={cfg.smtp_senha || ''} onChange={e => set('smtp_senha', e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold">
                {mostrarSenha ? 'ocultar' : 'ver'}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Nome do remetente</label>
            <input className={inputCls} value={cfg.remetente_nome || ''} onChange={e => set('remetente_nome', e.target.value)} placeholder="Suporte Mantran" />
          </div>
          <div>
            <label className={labelCls}>E-mail do remetente</label>
            <input className={inputCls} value={cfg.remetente_email || ''} onChange={e => set('remetente_email', e.target.value)} placeholder="nivel2@amantran.com.br" />
          </div>
        </div>
      </div>

      {/* Recebimento (IMAP/POP) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-black text-slate-800">Recebimento (e-mail vira chamado)</h3>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">Usado na próxima fase, quando o e-mail recebido abrir um chamado automaticamente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Protocolo</label>
            <select className={inputCls} value={cfg.entrada_protocolo || 'IMAP'} onChange={e => set('entrada_protocolo', e.target.value as any)}>
              <option value="IMAP">IMAP</option>
              <option value="POP">POP</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Servidor de entrada</label>
            <input className={inputCls} value={cfg.entrada_host || ''} onChange={e => set('entrada_host', e.target.value)} placeholder="mail.amantran.com.br" />
          </div>
          <div>
            <label className={labelCls}>Porta</label>
            <input type="number" className={inputCls} value={cfg.entrada_porta ?? ''} onChange={e => set('entrada_porta', e.target.value ? Number(e.target.value) : null)} placeholder="993" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!cfg.entrada_ssl} onChange={e => set('entrada_ssl', e.target.checked)} className="w-4 h-4 accent-brand-600" />
              Usar SSL/TLS
            </label>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mr-auto">
          <input type="checkbox" checked={!!cfg.ativo} onChange={e => set('ativo', e.target.checked)} className="w-4 h-4 accent-brand-600" />
          Ativar processamento de e-mail
        </label>
        <button
          type="button"
          onClick={enviarTeste}
          disabled={enviandoTeste || !cfg.smtp_host || !cfg.smtp_usuario}
          title="Envia um e-mail de teste usando a configuração atual"
          className="py-2 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors cursor-pointer"
        >
          {enviandoTeste ? 'Enviando...' : 'Enviar e-mail de teste'}
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="py-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Observação de segurança: o envio de e-mails acontece no servidor (backend), nunca no navegador — a senha não é usada no seu computador. O botão "Enviar e-mail de teste" funciona após publicar a nova versão na Vercel.
      </p>
    </div>
  )
}

function CadastroCard({ tabela, titulo, itens, onChange }: {
  tabela: 'ticket_tipos' | 'ticket_classificacoes' | 'ticket_grupos' | 'ticket_departamentos'
  titulo: string
  itens: any[]
  onChange: () => void
}) {
  const [novo, setNovo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const adicionar = async () => {
    const nome = novo.trim()
    if (!nome) return
    setSalvando(true)
    try {
      await api.createTicketCadastro(tabela, nome)
      setNovo('')
      onChange()
    } catch (err) {
      console.error('Erro ao criar cadastro:', err)
      alert('Erro ao adicionar. Verifique se já existe.')
    } finally {
      setSalvando(false)
    }
  }

  const remover = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return
    try {
      await api.deleteTicketCadastro(tabela, id)
      onChange()
    } catch (err) {
      console.error('Erro ao remover cadastro:', err)
      alert('Erro ao remover.')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col">
      <h3 className="text-sm font-black text-slate-800 mb-3">{titulo}</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={novo}
          onChange={e => setNovo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
          placeholder={`Novo ${titulo.toLowerCase().replace(/s$/, '')}...`}
          className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={salvando || !novo.trim()}
          className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
        >
          {salvando ? <Spinner className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-clean pr-1">
        {itens.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Nenhum registro.</p>
        ) : (
          itens.map(it => (
            <div key={it.id} className="group flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-sm text-slate-700 truncate">{it.nome}</span>
              <button
                type="button"
                onClick={() => remover(it.id, it.nome)}
                title="Remover"
                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// Modal de criação manual de ticket
// ============================================================
function NovoTicketTela({ agentes, tecnicos, clientes, contatos, cadastros, onVoltar, onCreated }: {
  agentes: UsuarioSistema[]
  tecnicos: UsuarioSistema[]
  clientes: any[]
  contatos: any[]
  cadastros: { tipos: any[]; classificacoes: any[]; grupos: any[]; departamentos: any[] }
  onVoltar: () => void
  onCreated: () => void
}) {
  const [contatoTexto, setContatoTexto] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [departamentoId, setDepartamentoId] = useState('')
  const [status, setStatus] = useState('Aberto')
  const [prioridade, setPrioridade] = useState('Baixa')
  const [grupoId, setGrupoId] = useState('')
  const [agenteId, setAgenteId] = useState('')
  const [classificacaoId, setClassificacaoId] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tags, setTags] = useState('')
  const [anexos, setAnexos] = useState<{ nome: string; tipo: string; url: string; tamanho: number }[]>([])
  const [salvando, setSalvando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const adicionarArquivos = (files: File[]) => {
    files.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { alert(`"${file.name}" excede 8MB.`); return }
      const reader = new FileReader()
      reader.onload = ev => {
        setAnexos(prev => [...prev, { nome: file.name || `imagem-${Date.now()}.png`, tipo: file.type, url: ev.target?.result as string, tamanho: file.size }])
      }
      reader.readAsDataURL(file)
    })
  }
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    adicionarArquivos(files)
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const imgs = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
    if (imgs.length) {
      const arqs = imgs.map(i => i.getAsFile()).filter(Boolean) as File[]
      if (arqs.length) { e.preventDefault(); adicionarArquivos(arqs) }
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assunto.trim()) { alert('Informe o assunto do ticket.'); return }
    if (!htmlTemTexto(descricao)) { alert('Informe a descrição do ticket.'); return }
    setSalvando(true)
    try {
      const empresaMatch = clientes.find(c => (c.nome_empresa || '').toLowerCase() === empresa.trim().toLowerCase())
      const agente = agentes.find(a => a.id === agenteId)
      const tecnico = tecnicos.find(t => t.id === tecnicoId)
      const novo = await api.createTicket({
        titulo: assunto.trim(),
        descricao: descricao.trim() || null,
        cliente_nome: contatoNome.trim() || null,
        cliente_email: contatoEmail.trim() || null,
        cliente_telefone: telefone.trim() || null,
        // (HTML enviado; renderização segura no detalhe do ticket)
        cliente_id: empresaMatch ? empresaMatch.id : null,
        prioridade,
        status,
        origem: 'manual',
        tipo_id: tipoId || null,
        departamento_id: departamentoId || null,
        grupo_id: grupoId || null,
        classificacao_id: classificacaoId || null,
        agente_id: agenteId || null,
        agente_nome: agente ? agente.nome : null,
        tecnico_id: tecnicoId || null,
        tecnico_nome: tecnico ? tecnico.nome : null,
        tags: tags.trim() || null
      })
      // Vincula os anexos ao ticket recém-criado
      for (const a of anexos) {
        await api.addTicketAnexo({
          ticket_id: novo.id,
          arquivo_nome: a.nome,
          arquivo_tipo: a.tipo,
          arquivo_url: a.url,
          tamanho_bytes: a.tamanho
        })
      }
      onCreated()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao criar ticket: ' + (err.message || 'Desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="text-slate-800 h-full flex flex-col min-h-0">
      {/* Cabeçalho fixo */}
      <div className="flex items-center gap-3 shrink-0 pb-4">
        <button onClick={onVoltar} className="p-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-brand-600 hover:border-brand-400 transition-colors shrink-0 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
            <TicketIcon className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Novo Ticket</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-clean">
        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {/* Contato (autocomplete) */}
          <div>
            <label className={labelCls}>Contato <span className="text-red-500">*</span></label>
            <input
              type="text"
              list="lista-contatos-novo"
              value={contatoTexto}
              onChange={e => {
                const v = e.target.value
                setContatoTexto(v)

                // Extrai nome/email do formato "Nome" <email> (ou texto livre)
                let nome = v.trim()
                let email = ''
                const match = v.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
                if (match) {
                  nome = match[1].trim()
                  email = match[2].trim()
                }
                setContatoNome(nome)
                setContatoEmail(email)

                // Procura o contato correspondente (por email ou nome) para preencher a empresa
                const ct = contatos.find(c =>
                  (email && (c.email || '').toLowerCase() === email.toLowerCase()) ||
                  (c.nome || '').toLowerCase() === nome.toLowerCase()
                )
                if (ct) {
                  if (!email && ct.email) setContatoEmail(ct.email)
                  // Preenche a empresa automaticamente
                  if (ct.empresa_id) {
                    const emp = clientes.find(c => c.id === ct.empresa_id)
                    if (emp) setEmpresa(emp.nome_empresa)
                  } else if (ct.empresa_nome) {
                    setEmpresa(ct.empresa_nome)
                  }
                }
              }}
              placeholder="Digite o nome ou e-mail do contato..."
              required
              className={inputCls}
            />
            <datalist id="lista-contatos-novo">
              {contatos.map(c => (
                <option key={c.id} value={c.email ? `"${c.nome}" <${c.email}>` : c.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelCls}>Telefone</label>
            <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className={inputCls} />
          </div>

          {/* Empresa (autocomplete) */}
          <div>
            <label className={labelCls}>Empresa</label>
            <input
              type="text"
              list="lista-empresas-novo"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Digite o nome do cliente..."
              className={inputCls}
            />
            <datalist id="lista-empresas-novo">
              {clientes.map(c => <option key={c.id} value={c.nome_empresa} />)}
            </datalist>
          </div>

          <div>
            <label className={labelCls}>Tipo</label>
            <select value={tipoId} onChange={e => setTipoId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {cadastros.tipos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Departamento</label>
            <select value={departamentoId} onChange={e => setDepartamentoId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {cadastros.departamentos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status <span className="text-red-500">*</span></label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prioridade <span className="text-red-500">*</span></label>
            <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className={inputCls}>
              {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Grupo</label>
            <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {cadastros.grupos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Agente</label>
            <select value={agenteId} onChange={e => setAgenteId(e.target.value)} className={inputCls}>
              <option value="">-- Sem agente --</option>
              {agentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Classificação Cliente</label>
            <select value={classificacaoId} onChange={e => setClassificacaoId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {cadastros.classificacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Responsável (Técnico)</label>
            <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          {/* Assunto */}
          <div>
            <label className={labelCls}>Assunto <span className="text-red-500">*</span></label>
            <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Ex: Liberar novos usuários" required className={inputCls} />
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Descrição <span className="text-red-500">*</span></label>
            <RichTextEditor
              value={descricao}
              onChange={setDescricao}
              onPaste={handlePaste}
              placeholder="Descreva o chamado... (você pode colar prints com Ctrl+V)"
              minHeight={160}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" /> Anexar imagem/arquivo
              </button>
              <span className="text-[11px] text-slate-400">ou cole um print (Ctrl+V)</span>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFile} className="hidden" />

            {anexos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {anexos.map((a, i) => (
                  <div key={i} className="relative">
                    {a.tipo.startsWith('image/') ? (
                      <img src={a.url} alt={a.nome} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                        <Paperclip className="w-3 h-3 text-brand-500" />
                        <span className="max-w-[120px] truncate">{a.nome}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-red-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags</label>
            <TagsInput value={tags} onChange={setTags} />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onVoltar} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={salvando} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{salvando ? 'Criando...' : 'Criar Ticket'}</span>
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Detalhe do ticket
// ============================================================
function TicketDetalhe({ ticketId, agentes, tecnicos, clientes, contatos, emailsFuncionarios, cadastros, onVoltar, onChange }: {
  ticketId: string
  agentes: UsuarioSistema[]
  tecnicos: UsuarioSistema[]
  clientes: any[]
  contatos: any[]
  emailsFuncionarios: string[]
  cadastros: { tipos: any[]; classificacoes: any[]; grupos: any[]; departamentos: any[] }
  onVoltar: () => void
  onChange: () => void
}) {
  const user = getLoggedUser()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [mensagens, setMensagens] = useState<TicketMensagem[]>([])
  const [anexos, setAnexos] = useState<TicketAnexo[]>([])
  const [loading, setLoading] = useState(true)

  // Composer
  const [modo, setModo] = useState<'resposta' | 'anotacao'>('resposta')
  const [texto, setTexto] = useState('')
  const [anexosPend, setAnexosPend] = useState<{ nome: string; tipo: string; url: string; tamanho: number }[]>([])
  const [enviando, setEnviando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Drawer de edição do ticket (contato, assunto, descrição, anexos)
  const [editOpen, setEditOpen] = useState(false)
  const [editContatoNome, setEditContatoNome] = useState('')
  const [editContatoEmail, setEditContatoEmail] = useState('')
  const [editAssunto, setEditAssunto] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editAnexos, setEditAnexos] = useState<{ nome: string; tipo: string; url: string; tamanho: number }[]>([])
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)

  // Perfil do contato (modal)
  const [contatoAberto, setContatoAberto] = useState<any | null>(null)
  // Contato vinculado ao ticket (para exibir empresa no cabeçalho)
  const [contatoDoTicket, setContatoDoTicket] = useState<any | null>(null)

  const abrirContato = async () => {
    if (!ticket) return
    try {
      let contato = null
      if (ticket.contato_id) contato = await api.getContatoById(ticket.contato_id)
      if (!contato) {
        contato = await api.getOrCreateContatoByEmail(ticket.cliente_email || '', ticket.cliente_nome || 'Contato')
        // vincula o ticket ao contato resolvido
        if (contato && ticket.contato_id !== contato.id) {
          await api.updateTicket(ticket.id, { contato_id: contato.id })
        }
      }
      setContatoAberto(contato)
    } catch (err: any) {
      alert('Erro ao abrir contato: ' + (err.message || 'Desconhecido'))
    }
  }

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await api.getTicketById(ticketId)
      setTicket(data)
      setMensagens(data.mensagens)
      setAnexos(data.anexos)
      // Contato vinculado (para exibir a empresa no cabeçalho)
      if (data.contato_id) {
        api.getContatoById(data.contato_id).then(setContatoDoTicket).catch(() => setContatoDoTicket(null))
      } else {
        setContatoDoTicket(null)
      }
      // Marca como lido ao abrir
      if (!data.lido) {
        await api.marcarTicketLido(ticketId).catch(() => {})
      }
    } catch (err) {
      console.error('Erro ao carregar ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    files.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { alert(`"${file.name}" excede 8MB.`); return }
      const reader = new FileReader()
      reader.onload = ev => {
        setAnexosPend(prev => [...prev, { nome: file.name, tipo: file.type, url: ev.target?.result as string, tamanho: file.size }])
      }
      reader.readAsDataURL(file)
    })
  }

  const enviar = async (novoStatus?: string) => {
    if (!texto.trim() && anexosPend.length === 0) { alert('Escreva uma mensagem ou anexe um arquivo.'); return }
    setEnviando(true)
    try {
      const msg = await api.addTicketMensagem({
        ticket_id: ticketId,
        tipo: modo,
        conteudo: texto.trim() || '(anexo)',
        autor_id: user?.id || null,
        autor_nome: user?.nome || user?.login || 'Agente',
        autor_tipo: 'agente',
        novo_status: novoStatus || null
      })
      // Anexos
      for (const a of anexosPend) {
        await api.addTicketAnexo({
          ticket_id: ticketId,
          mensagem_id: msg.id,
          arquivo_nome: a.nome,
          arquivo_tipo: a.tipo,
          arquivo_url: a.url,
          tamanho_bytes: a.tamanho
        })
      }
      // Se for RESPOSTA (não anotação interna), envia por e-mail ao cliente.
      // Destino: cliente_email; se vazio, usa cliente_nome quando for um e-mail válido.
      if (modo === 'resposta' && texto.trim()) {
        const ehEmail = (s?: string | null) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
        const destino = ehEmail(ticket?.cliente_email) ? ticket!.cliente_email!.trim()
          : ehEmail(ticket?.cliente_nome) ? ticket!.cliente_nome!.trim()
          : ''

        if (!destino) {
          alert('A resposta foi salva no chamado, mas não há um e-mail de cliente válido para enviar. Cadastre o e-mail do contato no chamado.')
        } else {
          const assunto = `[#${ticket!.numero}] ${ticket!.titulo || 'Seu chamado'}`
          const linkChamado = `${window.location.origin}/tickets?chamado=${ticket!.numero}`
          const corpoTexto = `${texto.trim()}\n\n---\nChamado #${ticket!.numero} - ${ticket!.titulo || ''}\nAcompanhe seu chamado: ${linkChamado}\n\nResponda a este e-mail mantendo o assunto para dar continuidade ao atendimento.`
          const corpoHtml = `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;line-height:1.6;max-width:600px">
              <div style="font-size:15px;color:#1e293b">
                ${texto.trim().replace(/\n/g, '<br>')}
              </div>

              <div style="margin-top:24px;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
                <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:bold">Seu chamado</p>
                <p style="margin:0 0 12px;font-size:14px;color:#334155"><b>#${ticket!.numero}</b> — ${ticket!.titulo || ''}</p>
                <a href="${linkChamado}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:10px">
                  Acompanhar chamado
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
              <p style="font-size:12px;color:#94a3b8;margin:0">
                Este é um retorno referente ao seu chamado #${ticket!.numero}. Responda a este e-mail mantendo o assunto para dar continuidade ao atendimento.
              </p>
            </div>`
          const r = await api.enviarEmail({
            para: destino,
            assunto,
            html: corpoHtml,
            texto: corpoTexto
          })
          if (!r.ok) {
            alert('A resposta foi salva no chamado, mas o e-mail ao cliente falhou:\n\n' + (r.erro || 'erro desconhecido'))
          }
        }
      }

      setTexto('')
      setAnexosPend([])
      await carregar()
      onChange()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao enviar: ' + (err.message || 'Desconhecido'))
    } finally {
      setEnviando(false)
    }
  }

  const atualizarPropriedade = async (updates: Partial<Ticket>) => {
    try {
      await api.updateTicket(ticketId, updates)
      setTicket(prev => prev ? { ...prev, ...updates } : prev)
      onChange()
    } catch (err: any) {
      alert('Erro ao atualizar: ' + (err.message || 'Desconhecido'))
    }
  }

  const anexosDaMensagem = (mensagemId: string) => anexos.filter(a => a.mensagem_id === mensagemId)
  const anexosDoTicket = anexos.filter(a => !a.mensagem_id)

  // Abrir drawer de edição preenchendo com os dados atuais
  const abrirEdicao = () => {
    if (!ticket) return
    setEditContatoNome(ticket.cliente_nome || '')
    setEditContatoEmail(ticket.cliente_email || '')
    setEditAssunto(ticket.titulo || '')
    setEditDescricao(ticket.descricao || '')
    setEditAnexos([])
    setEditOpen(true)
  }

  // Adiciona arquivos (input ou colar) à edição
  const adicionarArquivosEdit = (files: File[]) => {
    files.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { alert(`"${file.name}" excede 8MB.`); return }
      const reader = new FileReader()
      reader.onload = ev => {
        setEditAnexos(prev => [...prev, { nome: file.name || `imagem-${Date.now()}.png`, tipo: file.type, url: ev.target?.result as string, tamanho: file.size }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleEditFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    adicionarArquivosEdit(files)
  }

  // Colar print/imagem direto no campo de descrição
  const handlePasteDescricao = (e: React.ClipboardEvent) => {
    const itens = Array.from(e.clipboardData?.items || [])
    const imagens = itens.filter(i => i.type.startsWith('image/'))
    if (imagens.length > 0) {
      const arquivos = imagens.map(i => i.getAsFile()).filter(Boolean) as File[]
      if (arquivos.length) {
        e.preventDefault()
        adicionarArquivosEdit(arquivos)
      }
    }
  }

  const salvarEdicao = async () => {
    if (!ticket) return
    if (!editAssunto.trim()) { alert('O assunto é obrigatório.'); return }
    setSalvandoEdit(true)
    try {
      await api.updateTicket(ticket.id, {
        titulo: editAssunto.trim(),
        descricao: editDescricao.trim() || null,
        cliente_nome: editContatoNome.trim() || null,
        cliente_email: editContatoEmail.trim() || null
      })
      // Anexos adicionados na edição ficam vinculados ao ticket (sem mensagem)
      for (const a of editAnexos) {
        await api.addTicketAnexo({
          ticket_id: ticket.id,
          arquivo_nome: a.nome,
          arquivo_tipo: a.tipo,
          arquivo_url: a.url,
          tamanho_bytes: a.tamanho
        })
      }
      setEditOpen(false)
      await carregar()
      onChange()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar edição: ' + (err.message || 'Desconhecido'))
    } finally {
      setSalvandoEdit(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-400 text-sm animate-pulse">Carregando ticket...</div>
    )
  }

  const inputLight = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelLight = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1'

  return (
    <div className="text-slate-800 h-full flex flex-col min-h-0">
      {/* Cabeçalho fixo */}
      <div className="flex items-center gap-3 shrink-0 pb-4">
        <button onClick={onVoltar} className="p-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-brand-600 hover:border-brand-400 transition-colors shrink-0 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate" title={ticket.titulo}>
            {ticket.titulo}
            {(() => {
              const empresa = contatoDoTicket
                ? (contatoDoTicket.empresa_id ? (clientes.find(c => c.id === contatoDoTicket.empresa_id)?.nome_empresa || contatoDoTicket.empresa_nome) : contatoDoTicket.empresa_nome)
                : null
              return empresa ? <span className="ml-2 text-sm font-semibold text-brand-600">• {empresa}</span> : null
            })()}
          </h1>
          <p className="text-xs text-slate-500"><span className="font-bold text-brand-600 font-mono">#{ticket.numero}</span> • aberto {tempoRelativo(ticket.created_at)}</p>
        </div>
        <span className={clsx('text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0', STATUS_CLASSES_LIGHT[ticket.status] || 'bg-slate-100 text-slate-600 border-slate-300')}>
          {ticket.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Coluna principal: thread + composer (com scroll próprio) */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-clean pr-1 space-y-3">
            {/* Descrição inicial */}
            {ticket.descricao && (
              <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                {/* Ações no hover: Editar / Encaminhar */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={abrirEdicao}
                    title="Editar ticket"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 shadow-sm transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Encaminhar (disponível na integração de e-mail)"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-300 shadow-sm cursor-not-allowed"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                    {(ticket.cliente_nome || '?').charAt(0)}
                  </div>
                  {/* Nome do contato: hover mostra resumo, clique abre o perfil */}
                  <span className="relative group/contato">
                    <button
                      type="button"
                      onClick={abrirContato}
                      className="text-xs font-bold text-brand-700 hover:underline"
                    >
                      {ticket.cliente_nome || 'Cliente'}
                    </button>
                    {/* Tooltip */}
                    <span className="pointer-events-none group-hover/contato:pointer-events-auto absolute left-0 top-6 z-20 w-64 opacity-0 group-hover/contato:opacity-100 transition-opacity">
                      <span className="block bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                        <span className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-sm font-black text-brand-600 uppercase shrink-0">
                            {(ticket.cliente_nome || '?').charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-800 truncate">{ticket.cliente_nome || 'Cliente'}</span>
                            <button type="button" onClick={abrirContato} className="text-xs text-brand-600 hover:underline">Exibir tickets</button>
                          </span>
                        </span>
                        {ticket.cliente_email && (
                          <span className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 break-all">
                            <Mail className="w-3.5 h-3.5 shrink-0" /> {ticket.cliente_email}
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">relatado por e-mail • {formatDataHora(ticket.created_at)}</span>
                </div>
                {/^\s*<[a-z][\s\S]*>/i.test(ticket.descricao || '') ? (
                  <div
                    className="rte-content text-sm text-slate-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(ticket.descricao || '') }}
                  />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.descricao}</p>
                )}
                {anexosDoTicket.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {anexosDoTicket.map(a => <AnexoChip key={a.id} anexo={a} />)}
                  </div>
                )}
              </div>
            )}

            {/* Thread */}
            {mensagens.map(m => {
              const isAnotacao = m.tipo === 'anotacao'
              return (
                <div
                  key={m.id}
                  className={clsx(
                    'rounded-2xl p-4 border shadow-sm',
                    isAnotacao ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                      {(m.autor_nome || '?').charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{m.autor_nome || 'Agente'}</span>
                    {isAnotacao && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                        Anotação interna
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 ml-auto">{formatDataHora(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.conteudo}</p>
                  {anexosDaMensagem(m.id).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {anexosDaMensagem(m.id).map(a => <AnexoChip key={a.id} anexo={a} />)}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Composer */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Abas Responder / Anotação */}
              <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setModo('resposta')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors',
                    modo === 'resposta' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Send className="w-3.5 h-3.5" /> Responder
                </button>
                <button
                  type="button"
                  onClick={() => setModo('anotacao')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors',
                    modo === 'anotacao' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <StickyNote className="w-3.5 h-3.5" /> Anotação Interna
                </button>
              </div>

              <div className={clsx('p-3', modo === 'anotacao' && 'bg-amber-50/50')}>
                {modo === 'anotacao' && (
                  <p className="text-[11px] text-amber-700 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Esta anotação é visível apenas para a equipe, não para o cliente.
                  </p>
                )}
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder={modo === 'resposta' ? 'Digite sua resposta ao cliente...' : 'Digite uma anotação interna...'}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500 resize-y"
                />

                {/* Anexos pendentes */}
                {anexosPend.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {anexosPend.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                        <Paperclip className="w-3 h-3 text-brand-500" />
                        <span className="max-w-[140px] truncate">{a.nome}</span>
                        <button type="button" onClick={() => setAnexosPend(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                    title="Anexar arquivo, imagem ou GIF"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFile} className="hidden" />

                  <div className="flex items-center gap-2">
                    {modo === 'resposta' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={enviando}
                          onClick={() => enviar('Pendente')}
                          className="py-2 px-4 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 transition-colors"
                        >
                          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Enviar
                        </button>
                        <select
                          onChange={e => { if (e.target.value) enviar(e.target.value) }}
                          value=""
                          title="Enviar e definir status"
                          className="py-2 px-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-600 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="">Enviar e definir…</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Resolvido">Resolvido</option>
                          <option value="Fechado">Fechado</option>
                          <option value="Aguardando cliente">Aguardando cliente</option>
                          <option value="Aguardando terceiros">Aguardando terceiros</option>
                        </select>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => enviar()}
                        className="py-2 px-4 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5"
                      >
                        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
                        Salvar Anotação
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna lateral: propriedades (scroll próprio) */}
        <div className="flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-clean pr-1 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Propriedades</h3>

              <div>
                <label className={labelLight}>Status</label>
                <select
                  value={ticket.status}
                  onChange={e => atualizarPropriedade({ status: e.target.value, ...(e.target.value === 'Fechado' ? { fechado_at: new Date().toISOString() } : e.target.value === 'Resolvido' ? { resolvido_at: new Date().toISOString() } : {}) })}
                  className={inputLight}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Prioridade</label>
                <select value={ticket.prioridade} onChange={e => atualizarPropriedade({ prioridade: e.target.value })} className={inputLight}>
                  {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Agente Responsável</label>
                <select
                  value={ticket.agente_id || ''}
                  onChange={e => {
                    const ag = agentes.find(a => a.id === e.target.value)
                    atualizarPropriedade({ agente_id: e.target.value || null, agente_nome: ag ? ag.nome : null })
                  }}
                  className={inputLight}
                >
                  <option value="">-- Sem agente --</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Responsável (Técnico)</label>
                <select
                  value={ticket.tecnico_id || ''}
                  onChange={e => {
                    const tc = tecnicos.find(a => a.id === e.target.value)
                    atualizarPropriedade({ tecnico_id: e.target.value || null, tecnico_nome: tc ? tc.nome : null })
                  }}
                  className={inputLight}
                >
                  <option value="">-- Sem técnico --</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Tipo</label>
                <select value={ticket.tipo_id || ''} onChange={e => atualizarPropriedade({ tipo_id: e.target.value || null })} className={inputLight}>
                  <option value="">--</option>
                  {cadastros.tipos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Classificação Cliente</label>
                {(() => {
                  // Derivada automaticamente (igual à lista/contatos): Mantran se funcionário,
                  // senão o "tipo" da empresa do contato vinculado ao ticket.
                  const email = (contatoDoTicket?.email || ticket.cliente_email || '').trim().toLowerCase()
                  const nome = (ticket.cliente_nome || '').trim().toLowerCase()
                  const ct = contatoDoTicket || contatos.find(c =>
                    (ticket.contato_id && c.id === ticket.contato_id) ||
                    (email && (c.email || '').toLowerCase() === email) ||
                    (nome && (c.nome || '').toLowerCase() === nome)
                  )
                  let classificacao = ''
                  if (email && emailsFuncionarios.includes(email)) classificacao = 'Mantran'
                  else if (ct?.empresa_id) classificacao = clientes.find(c => c.id === ct.empresa_id)?.tipo || ''
                  return (
                    <div className={clsx(inputLight, 'flex items-center')}>
                      {classificacao
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">{classificacao}</span>
                        : <span className="text-slate-400">--</span>}
                    </div>
                  )
                })()}
              </div>

              <div>
                <label className={labelLight}>Grupo</label>
                <select value={ticket.grupo_id || ''} onChange={e => atualizarPropriedade({ grupo_id: e.target.value || null })} className={inputLight}>
                  <option value="">--</option>
                  {cadastros.grupos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Departamento</label>
                <select value={ticket.departamento_id || ''} onChange={e => atualizarPropriedade({ departamento_id: e.target.value || null })} className={inputLight}>
                  <option value="">--</option>
                  {cadastros.departamentos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelLight}>Tags</label>
                <TagsInput
                  value={ticket.tags || ''}
                  onChange={novo => atualizarPropriedade({ tags: novo || null })}
                />
              </div>
            </div>

            {/* Solicitante */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Solicitante</h3>
              <div>
                <label className={labelLight}>Empresa (Cliente)</label>
                <input
                  type="text"
                  list="lista-empresas-ticket"
                  defaultValue={ticket.cliente_nome || ''}
                  onBlur={e => { if (e.target.value !== (ticket.cliente_nome || '')) atualizarPropriedade({ cliente_nome: e.target.value.trim() || null }) }}
                  placeholder="Digite o nome do cliente..."
                  className={inputLight}
                />
                <datalist id="lista-empresas-ticket">
                  {clientes.map(c => <option key={c.id} value={c.nome_empresa} />)}
                </datalist>
              </div>
              <div>
                <label className={labelLight}>Telefone</label>
                <input
                  type="text"
                  defaultValue={ticket.cliente_telefone || ''}
                  onBlur={e => { if (e.target.value !== (ticket.cliente_telefone || '')) atualizarPropriedade({ cliente_telefone: e.target.value.trim() || null }) }}
                  className={inputLight}
                />
              </div>
              {ticket.cliente_email && <div className="text-xs text-slate-500 break-all pt-1">{ticket.cliente_email}</div>}
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 mt-1">
                Origem: {ticket.origem === 'email' ? '📧 E-mail' : '✍️ Manual'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Drawer lateral: Editar ticket ===== */}
      {editOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          {/* painel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-600" /> Editar ticket
              </h2>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-clean p-5 space-y-4">
              {/* Contato */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Contato <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  list="lista-empresas-edit"
                  value={editContatoNome}
                  onChange={e => setEditContatoNome(e.target.value)}
                  placeholder="Nome do contato / cliente"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500"
                />
                <datalist id="lista-empresas-edit">
                  {clientes.map(c => <option key={c.id} value={c.nome_empresa} />)}
                </datalist>
                <input
                  type="email"
                  value={editContatoEmail}
                  onChange={e => setEditContatoEmail(e.target.value)}
                  placeholder="E-mail do contato"
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Assunto */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Assunto <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editAssunto}
                  onChange={e => setEditAssunto(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Descrição (com colar print) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição <span className="text-red-500">*</span></label>
                <RichTextEditor
                  value={editDescricao}
                  onChange={setEditDescricao}
                  onPaste={handlePasteDescricao}
                  placeholder="Descreva o chamado... (você pode colar prints com Ctrl+V)"
                  minHeight={200}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => editFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Anexar imagem/arquivo
                  </button>
                  <span className="text-[11px] text-slate-400">ou cole um print (Ctrl+V)</span>
                </div>
                <input ref={editFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleEditFile} className="hidden" />

                {/* Anexos pendentes na edição */}
                {editAnexos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editAnexos.map((a, i) => (
                      <div key={i} className="relative">
                        {a.tipo.startsWith('image/') ? (
                          <img src={a.url} alt={a.nome} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                            <Paperclip className="w-3 h-3 text-brand-500" />
                            <span className="max-w-[120px] truncate">{a.nome}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditAnexos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-red-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={salvandoEdit}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {salvandoEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {salvandoEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de perfil do contato ===== */}
      {contatoAberto && (
        <ContatoModal
          contato={contatoAberto}
          clientes={clientes}
          grupos={cadastros.grupos}
          onClose={() => setContatoAberto(null)}
          onChange={() => { carregar(); onChange() }}
        />
      )}
    </div>
  )
}

// Input de tags (chips). Guarda/retorna como texto separado por vírgula.
function TagsInput({ value, onChange }: { value: string; onChange: (csv: string) => void }) {
  const tags = (value || '').split(',').map(t => t.trim()).filter(Boolean)
  const [texto, setTexto] = useState('')

  const commit = (novas: string[]) => onChange(novas.join(', '))

  const adicionar = () => {
    const t = texto.trim()
    if (!t) return
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) { setTexto(''); return }
    commit([...tags, t])
    setTexto('')
  }

  const remover = (tag: string) => commit(tags.filter(t => t !== tag))

  return (
    <div className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 focus-within:border-brand-500 flex flex-wrap gap-1.5 items-center">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700">
          {tag}
          <button type="button" onClick={() => remover(tag)} className="text-slate-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); adicionar() }
          else if (e.key === 'Backspace' && !texto && tags.length) { remover(tags[tags.length - 1]) }
        }}
        onBlur={adicionar}
        placeholder={tags.length ? '' : 'Digite e Enter'}
        className="flex-1 min-w-[80px] px-1 py-0.5 text-sm text-slate-700 bg-transparent focus:outline-none"
      />
    </div>
  )
}

// Chip de anexo (com preview de imagem)
function AnexoChip({ anexo }: { anexo: TicketAnexo }) {
  const isImg = (anexo.arquivo_tipo || '').startsWith('image/')
  if (isImg) {
    return (
      <a href={anexo.arquivo_url} target="_blank" rel="noreferrer" className="block">
        <img src={anexo.arquivo_url} alt={anexo.arquivo_nome} className="max-h-32 rounded-lg border border-slate-200 object-cover" />
      </a>
    )
  }
  return (
    <a
      href={anexo.arquivo_url}
      download={anexo.arquivo_nome}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
    >
      <Download className="w-3.5 h-3.5 text-brand-500" />
      <span className="max-w-[160px] truncate">{anexo.arquivo_nome}</span>
    </a>
  )
}
