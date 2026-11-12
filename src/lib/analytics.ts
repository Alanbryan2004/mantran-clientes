import { supabase } from './supabase'
import { getLoggedUser, isClienteUser } from './auth'

export interface AcessoItem {
  id: string
  usuario_id: string | null
  usuario_nome: string | null
  usuario_login: string | null
  cliente_nome: string | null
  rota: string
  tela_nome: string
  dispositivo: string
  created_at: string
}

export interface FaqVisualizacaoItem {
  id: string
  procedimento_id: string
  procedimento_titulo: string
  categoria_nome: string | null
  usuario_id: string | null
  usuario_nome: string | null
  cliente_nome: string | null
  origem: string
  created_at: string
}

// Contato que ganhou acesso ao portal no período (card "Novos Usuários")
export interface NovoUsuario {
  id: string
  nome: string                                  // nome do contato
  email: string
  empresa: string
  origem: 'autocadastro' | 'convite' | null     // cadastrou-se sozinho | liberado pelo Suporte
  cadastroEm: string                            // ISO: confirmação do e-mail / criação da senha
}

export interface FaqAcessoDetalhe {
  chave: string
  usuario_nome: string
  usuario_detalhe?: string | null
  empresa: string
  tipo: 'cliente' | 'visitante' | 'equipe'
  acessos: number
  ultimo_acesso: string
}

export interface TopFaqItem {
  id: string
  titulo: string
  categoria: string
  acessos: number
  acessosClientes: number
  acessosVisitantes: number
  acessosEquipe: number
  detalhes: FaqAcessoDetalhe[]
}

export interface UsuarioAtivoResumo {
  chave: string
  usuario_nome: string
  usuario_detalhe?: string | null
  empresa: string
  tipo: 'cliente' | 'visitante' | 'equipe'
  acessosTelas: number
  acessosFaq: number
  videosAssistidos: number
  totalInteracoes: number
  principaisTelas: string[]
  ultimo_acesso: string
}

export interface VideoVisualizacaoDetalhe {
  id: string
  video_id: string
  video_titulo: string
  instrutor: string
  usuario_nome: string
  usuario_detalhe?: string | null
  empresa: string
  tipo: 'cliente' | 'visitante' | 'equipe'
  progresso_pct: number
  concluido: boolean
  ultima_vez: string
}

export interface AnalyticsResumo {
  totalAcessos: number
  totalFaqLidos: number
  totalVideosAssistidos: number
  totalUsuariosAtivos: number
  totalNovosUsuarios: number
  novosUsuarios: NovoUsuario[]
  usuariosAtivosLista: UsuarioAtivoResumo[]
  detalhesVideosAssistidos: VideoVisualizacaoDetalhe[]
  topFaq: TopFaqItem[]
  topVideos: { id: string; titulo: string; instrutor: string; visualizacoes: number; concluidos: number }[]
  topTelas: { rota: string; tela_nome: string; acessos: number }[]
  topClientes: { nome: string; acessos: number; ultimo_acesso: string }[]
  historicoAcessos: { data: string; total: number }[]
}

// Mapeamento amigável de rotas
export function obterNomeTela(pathname: string): string {
  const norm = pathname.toLowerCase()
  if (norm === '/' || norm === '') return 'Dashboard Principal'
  if (norm.startsWith('/faq')) return 'FAQ - Base de Conhecimento'
  if (norm.startsWith('/academia')) return 'Academia Mantran'
  if (norm.startsWith('/cidades')) return 'Consulta de Cidades'
  if (norm.startsWith('/tickets')) return 'Portal de Chamados (Tickets)'
  if (norm.startsWith('/comercial')) return 'Dashboard Comercial'
  if (norm.startsWith('/clientes')) return 'Gestão de Clientes'
  if (norm.startsWith('/implantacoes')) return 'Implantações'
  if (norm.startsWith('/bases')) return 'Projetos e Bases'
  if (norm.startsWith('/processamento-shopee')) return 'Processamento Shopee'
  if (norm.startsWith('/separador')) return 'Separador de Planilhas'
  if (norm.startsWith('/juntar')) return 'Juntar Planilhas'
  if (norm.startsWith('/calendario')) return 'Calendário de Eventos'
  if (norm.startsWith('/campanha-email')) return 'Campanhas de E-mail'
  if (norm.startsWith('/usuarios')) return 'Gestão de Usuários'
  if (norm.startsWith('/rh')) return 'Recursos Humanos (RH)'
  if (norm.startsWith('/dev')) return 'Desenvolvimento & QA'
  if (norm.startsWith('/analytics') || norm.startsWith('/metricas')) return 'Métricas e Analytics'
  return pathname
}

// Controle em memória para evitar registros duplicados em cliques repetidos rápidos
let ultimoAcessoRota: string = ''
let ultimoAcessoTempo: number = 0
const faqVisualizadosSessao = new Map<string, number>()

/**
 * Registra o acesso a uma tela no sistema.
 * Não bloqueia a interface e falha silenciosamente caso o banco esteja indisponível.
 */
export async function registrarAcessoTela(pathname: string): Promise<void> {
  const agora = Date.now()
  if (ultimoAcessoRota === pathname && agora - ultimoAcessoTempo < 8000) {
    return // ignora navegação idêntica dentro de 8 segundos
  }
  ultimoAcessoRota = pathname
  ultimoAcessoTempo = agora

  try {
    const user = getLoggedUser()
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    const telaNome = obterNomeTela(pathname)

    // Identificação do cliente ou usuário
    let clienteNome = 'Equipe Mantran'
    if (isClienteUser()) {
      clienteNome = user?.nome || user?.login || 'Cliente Mantran'
    } else if (user?.cliente_email) {
      clienteNome = user?.cliente_email
    } else if (!user) {
      clienteNome = 'Visitante Público'
    }

    const payload = {
      usuario_id: user?.id || null,
      usuario_nome: user?.nome || user?.login || 'Visitante',
      usuario_login: user?.login || null,
      cliente_nome: clienteNome,
      rota: pathname,
      tela_nome: telaNome,
      dispositivo: isMobile ? 'Mobile' : 'Desktop',
      created_at: new Date().toISOString()
    }

    await supabase.from('acessos_log').insert(payload)
  } catch {
    // Tolerante: não interrompe a experiência do usuário
  }
}

/**
 * Registra a visualização de um manual ou procedimento do FAQ.
 */
export async function registrarVisualizacaoFaq(
  procedimentoId: string,
  titulo: string,
  categoriaNome?: string | null,
  origem: string = 'web'
): Promise<void> {
  if (!procedimentoId) return
  const agora = Date.now()
  const ultimoAcesso = faqVisualizadosSessao.get(procedimentoId)
  if (ultimoAcesso && agora - ultimoAcesso < 30000) {
    return // evita contar repetidamente o mesmo manual aberto na mesma sessão em menos de 30s
  }
  faqVisualizadosSessao.set(procedimentoId, agora)

  try {
    const user = getLoggedUser()
    let clienteNome = 'Equipe Mantran'
    if (isClienteUser()) {
      clienteNome = user?.nome || user?.login || 'Cliente Mantran'
    } else if (!user) {
      clienteNome = 'Visitante Público'
    }

    const payload = {
      procedimento_id: procedimentoId,
      procedimento_titulo: titulo,
      categoria_nome: categoriaNome || null,
      usuario_id: user?.id || null,
      usuario_nome: user?.nome || user?.login || 'Visitante',
      cliente_nome: clienteNome,
      origem: origem || 'web',
      created_at: new Date().toISOString()
    }

    await supabase.from('faq_visualizacoes').insert(payload)
  } catch {
    // Tolerante
  }
}

/**
 * Novos contatos com acesso ao portal (clientes que criaram a senha) dentro do período.
 * Fonte: usuários de perfil Cliente ativos com e-mail (os que entram pela tela de Contatos),
 * ligados ao contato e à empresa. Não conta funcionários nem os logins antigos de implantação (Empresa@Mantran).
 * A data é a da ativação do acesso; se as colunas novas ainda não existirem no banco, usa a criação do registro.
 */
export async function buscarNovosUsuarios(dataFiltro: Date | null): Promise<NovoUsuario[]> {
  // 1) Acessos ativos de clientes (tolerante à ausência das colunas de origem/data)
  let linhas: any[] = []
  const r1 = await supabase
    .from('usuario')
    .select('id, nome, login, email_pessoal, created_at, origem_cadastro, acesso_ativado_em')
    .eq('perfil', 'Cliente')
    .eq('ativo', true)
    .not('email_pessoal', 'is', null)
    .range(0, 999)
  if (r1.error) {
    if (!/origem_cadastro|acesso_ativado_em/i.test(r1.error.message || '')) throw r1.error
    const r2 = await supabase
      .from('usuario')
      .select('id, nome, login, email_pessoal, created_at')
      .eq('perfil', 'Cliente')
      .eq('ativo', true)
      .not('email_pessoal', 'is', null)
      .range(0, 999)
    if (r2.error) throw r2.error
    linhas = r2.data || []
  } else {
    linhas = r1.data || []
  }

  // 2) Período
  const noPeriodo = linhas
    .map(u => ({ u, quando: String(u.acesso_ativado_em || u.created_at || '') }))
    .filter(x => x.quando && (!dataFiltro || new Date(x.quando).getTime() >= dataFiltro.getTime()))
  if (noPeriodo.length === 0) return []

  // 3) Contato (nome) e empresa de cada e-mail
  const contatosPorEmail = new Map<string, { nome: string; empresa_id: string | null; empresa_nome: string | null }>()
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('ticket_contatos').select('nome, email, empresa_id, empresa_nome').range(de, de + 999)
    if (error) throw error
    for (const c of data || []) {
      const e = String(c.email || '').trim().toLowerCase()
      if (e && !contatosPorEmail.has(e)) contatosPorEmail.set(e, c)
    }
    if (!data || data.length < 1000) break
  }
  const idsEmpresa = [...new Set(
    noPeriodo.map(x => contatosPorEmail.get(String(x.u.email_pessoal).trim().toLowerCase())?.empresa_id).filter((v): v is string => !!v)
  )]
  const nomeEmpresaPorId = new Map<string, string>()
  if (idsEmpresa.length > 0) {
    const { data: cls, error: eCli } = await supabase.from('clientes').select('id, nome_empresa').in('id', idsEmpresa)
    if (eCli) throw eCli
    ;(cls || []).forEach((c: any) => nomeEmpresaPorId.set(c.id, c.nome_empresa || ''))
  }

  return noPeriodo
    .map(({ u, quando }): NovoUsuario => {
      const email = String(u.email_pessoal).trim().toLowerCase()
      const contato = contatosPorEmail.get(email)
      const empresa = (contato?.empresa_id && nomeEmpresaPorId.get(contato.empresa_id)) || contato?.empresa_nome || ''
      return {
        id: u.id,
        nome: contato?.nome || u.nome || email,
        email,
        empresa,
        origem: u.origem_cadastro === 'autocadastro' || u.origem_cadastro === 'convite' ? u.origem_cadastro : null,
        cadastroEm: quando
      }
    })
    .sort((a, b) => b.cadastroEm.localeCompare(a.cadastroEm)) // mais recentes primeiro
}

/**
 * Busca e consolida todas as métricas de engajamento para o Painel de Analytics.
 */
export async function getAnalyticsMetricas(periodo: 'hoje' | '7dias' | '30dias' | 'tudo' = '30dias'): Promise<AnalyticsResumo> {
  const agora = new Date()
  let dataFiltro: Date | null = null

  if (periodo === 'hoje') {
    dataFiltro = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  } else if (periodo === '7dias') {
    dataFiltro = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (periodo === '30dias') {
    dataFiltro = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  // 1. Consultar acessos_log (paginado para não truncar em 1.000 linhas)
  const acessos: AcessoItem[] = []
  for (let de = 0; ; de += 1000) {
    let q = supabase.from('acessos_log').select('*').order('created_at', { ascending: false }).range(de, de + 999)
    if (dataFiltro) q = q.gte('created_at', dataFiltro.toISOString())
    const { data, error } = await q
    if (error || !data || data.length === 0) break
    acessos.push(...(data as AcessoItem[]))
    if (data.length < 1000) break
  }

  // 2. Consultar faq_visualizacoes (paginado para não truncar em 1.000 linhas)
  const faqs: FaqVisualizacaoItem[] = []
  for (let de = 0; ; de += 1000) {
    let q = supabase.from('faq_visualizacoes').select('*').order('created_at', { ascending: false }).range(de, de + 999)
    if (dataFiltro) q = q.gte('created_at', dataFiltro.toISOString())
    const { data, error } = await q
    if (error || !data || data.length === 0) break
    faqs.push(...(data as FaqVisualizacaoItem[]))
    if (data.length < 1000) break
  }

  // 3. Consultar academia_visualizacoes, academia_videos e novos usuários (tabela usuario)
  let queryAcademia = supabase.from('academia_visualizacoes').select('*')
  if (dataFiltro) queryAcademia = queryAcademia.gte('ultima_vez', dataFiltro.toISOString())

  const [
    { data: visualizacoesVideos = [] },
    { data: videosCatalogo = [] },
    novosUsuarios
  ] = await Promise.all([
    queryAcademia,
    supabase.from('academia_videos').select('id, titulo, instrutor'),
    // Falha na lista de novos usuários não derruba o restante do painel
    buscarNovosUsuarios(dataFiltro).catch(err => {
      console.error('Erro ao buscar novos usuários:', err)
      return [] as NovoUsuario[]
    })
  ])

  // Enriquecimento de todos os usuários/empresas referenciados em acessos, FAQ e Academia
  const allUserIds = [...new Set([
    ...acessos.map(a => a.usuario_id),
    ...faqs.map(f => f.usuario_id),
    ...(visualizacoesVideos || []).map((v: any) => v.usuario_chave)
  ].filter((v): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v)))]

  const usuariosPorId = new Map<string, { id: string; nome: string; login: string; email_pessoal: string | null; perfil: string }>()
  if (allUserIds.length > 0) {
    const { data: usData } = await supabase
      .from('usuario')
      .select('id, nome, login, email_pessoal, perfil')
      .in('id', allUserIds)
    for (const u of usData || []) {
      if (u?.id) usuariosPorId.set(u.id, u)
    }
  }

  // Cruzar e-mails de usuários clientes com ticket_contatos e clientes para identificar a Empresa e o Nome do Contato
  const emailsClientes = [...new Set(
    Array.from(usuariosPorId.values())
      .map(u => {
        const em = u.email_pessoal || (u.login && u.login.includes('@') && !u.login.toLowerCase().trim().endsWith('@mantran') ? u.login : '')
        return String(em || '').trim().toLowerCase()
      })
      .filter(Boolean)
  )]

  const contatosPorEmail = new Map<string, { nome: string; empresa_id: string | null; empresa_nome: string | null }>()
  if (emailsClientes.length > 0) {
    const { data: cts } = await supabase
      .from('ticket_contatos')
      .select('nome, email, empresa_id, empresa_nome')
      .in('email', emailsClientes)
    for (const c of cts || []) {
      const e = String(c.email || '').trim().toLowerCase()
      if (e && !contatosPorEmail.has(e)) contatosPorEmail.set(e, c)
    }
  }

  const idsEmpresa = [...new Set(
    Array.from(contatosPorEmail.values()).map(c => c.empresa_id).filter((v): v is string => !!v)
  )]
  const nomeEmpresaPorId = new Map<string, string>()
  if (idsEmpresa.length > 0) {
    const { data: cls } = await supabase.from('clientes').select('id, nome_empresa').in('id', idsEmpresa)
    for (const c of cls || []) {
      if (c?.id) nomeEmpresaPorId.set(c.id, c.nome_empresa || '')
    }
  }

  // Helper unificado para identificar Empresa, Usuário e Perfil (Cliente, Visitante, Equipe Mantran)
  const identificarOrigem = (
    usuarioId: string | null | undefined,
    usuarioNomeRaw: string | null | undefined,
    clienteNomeRaw?: string | null | undefined,
    usuarioLoginRaw?: string | null | undefined
  ): {
    chave: string
    usuario_nome: string
    usuario_detalhe: string | null
    empresa: string
    tipo: 'cliente' | 'visitante' | 'equipe'
  } => {
    const u = usuarioId ? usuariosPorId.get(usuarioId) : undefined
    const isVisitante = !usuarioId || usuarioNomeRaw === 'Visitante' || clienteNomeRaw === 'Visitante Público'
    const isEquipe = !isVisitante && (
      clienteNomeRaw === 'Equipe Mantran' ||
      (u?.perfil && u.perfil !== 'Cliente')
    )

    if (isVisitante) {
      return {
        chave: 'visitante',
        usuario_nome: 'Visitante (Sem Login)',
        usuario_detalhe: 'Acesso público externo',
        empresa: 'Visitante Público',
        tipo: 'visitante'
      }
    }

    if (isEquipe) {
      return {
        chave: `equipe:${usuarioId || usuarioNomeRaw || 'equipe'}`,
        usuario_nome: u?.nome || usuarioNomeRaw || 'Colaborador Mantran',
        usuario_detalhe: u?.perfil ? `Perfil: ${u.perfil}` : 'Equipe Interna',
        empresa: 'Equipe Mantran',
        tipo: 'equipe'
      }
    }

    const rawEmail = u?.email_pessoal || (u?.login && u.login.includes('@') && !u.login.toLowerCase().trim().endsWith('@mantran') ? u.login : '')
    const emailNorm = String(rawEmail || '').trim().toLowerCase()
    const contato = emailNorm ? contatosPorEmail.get(emailNorm) : undefined
    const empresaContato = (contato?.empresa_id && nomeEmpresaPorId.get(contato.empresa_id)) || contato?.empresa_nome || ''

    const empresaNome =
      empresaContato ||
      (clienteNomeRaw && clienteNomeRaw !== 'Cliente Mantran' ? clienteNomeRaw : '') ||
      u?.nome ||
      usuarioNomeRaw ||
      'Cliente Mantran'

    const usuarioNome = contato?.nome || u?.nome || usuarioNomeRaw || emailNorm || 'Cliente'
    const usuarioDetalhe = emailNorm || u?.login || usuarioLoginRaw || null

    return {
      chave: `cliente:${usuarioId || `${empresaNome}|${usuarioNome}`}`,
      usuario_nome: usuarioNome,
      usuario_detalhe: usuarioDetalhe,
      empresa: empresaNome,
      tipo: 'cliente'
    }
  }

  // Mapa consolidado de Usuários Ativos (Telas + FAQ + Academia)
  const mapaUsuariosAtivos = new Map<string, {
    chave: string
    usuario_nome: string
    usuario_detalhe: string | null
    empresa: string
    tipo: 'cliente' | 'visitante' | 'equipe'
    acessosTelas: number
    acessosFaq: number
    videosAssistidos: number
    telasCount: Map<string, number>
    ultimo_acesso: string
  }>()

  const registrarAtividadeUsuario = (
    info: ReturnType<typeof identificarOrigem>,
    dataIso: string,
    origemTipo: 'tela' | 'faq' | 'video',
    telaNome?: string
  ) => {
    const curr = mapaUsuariosAtivos.get(info.chave) || {
      chave: info.chave,
      usuario_nome: info.usuario_nome,
      usuario_detalhe: info.usuario_detalhe,
      empresa: info.empresa,
      tipo: info.tipo,
      acessosTelas: 0,
      acessosFaq: 0,
      videosAssistidos: 0,
      telasCount: new Map<string, number>(),
      ultimo_acesso: dataIso
    }
    if (origemTipo === 'tela') {
      curr.acessosTelas++
      if (telaNome) {
        curr.telasCount.set(telaNome, (curr.telasCount.get(telaNome) || 0) + 1)
      }
    } else if (origemTipo === 'faq') {
      curr.acessosFaq++
    } else if (origemTipo === 'video') {
      curr.videosAssistidos++
    }
    if (dataIso && (!curr.ultimo_acesso || new Date(dataIso) > new Date(curr.ultimo_acesso))) {
      curr.ultimo_acesso = dataIso
    }
    mapaUsuariosAtivos.set(info.chave, curr)
  }

  // Contagem de telas
  const mapaTelas = new Map<string, { rota: string; tela_nome: string; acessos: number }>()
  const mapaClientes = new Map<string, { nome: string; acessos: number; ultimo_acesso: string }>()
  const historicoMapa = new Map<string, number>()

  ;(acessos || []).forEach((a: AcessoItem) => {
    // Telas
    const keyTela = a.tela_nome || a.rota
    const currTela = mapaTelas.get(keyTela) || { rota: a.rota, tela_nome: a.tela_nome, acessos: 0 }
    currTela.acessos++
    mapaTelas.set(keyTela, currTela)

    // Clientes
    const nomeCli = a.cliente_nome || a.usuario_nome || 'Visitante'
    const currCli = mapaClientes.get(nomeCli) || { nome: nomeCli, acessos: 0, ultimo_acesso: a.created_at }
    currCli.acessos++
    if (new Date(a.created_at) > new Date(currCli.ultimo_acesso)) {
      currCli.ultimo_acesso = a.created_at
    }
    mapaClientes.set(nomeCli, currCli)

    // Histórico por dia (YYYY-MM-DD)
    const dia = (a.created_at || '').slice(0, 10)
    if (dia) {
      historicoMapa.set(dia, (historicoMapa.get(dia) || 0) + 1)
    }

    const info = identificarOrigem(a.usuario_id, a.usuario_nome, a.cliente_nome, a.usuario_login)
    registrarAtividadeUsuario(info, a.created_at, 'tela', a.tela_nome || a.rota)
  })

  // Contagem de Manuais do FAQ + detalhamento de quem acessou (Visitante, Cliente por Empresa, Equipe Mantran)
  const mapaFaq = new Map<string, {
    id: string
    titulo: string
    categoria: string
    acessos: number
    acessosClientes: number
    acessosVisitantes: number
    acessosEquipe: number
    detalhesMap: Map<string, FaqAcessoDetalhe>
  }>()

  ;(faqs || []).forEach((f: FaqVisualizacaoItem) => {
    const key = f.procedimento_id || f.procedimento_titulo
    const curr = mapaFaq.get(key) || {
      id: f.procedimento_id,
      titulo: f.procedimento_titulo,
      categoria: f.categoria_nome || 'Geral',
      acessos: 0,
      acessosClientes: 0,
      acessosVisitantes: 0,
      acessosEquipe: 0,
      detalhesMap: new Map<string, FaqAcessoDetalhe>()
    }
    curr.acessos++

    const info = identificarOrigem(f.usuario_id, f.usuario_nome, f.cliente_nome)
    if (info.tipo === 'visitante') curr.acessosVisitantes++
    else if (info.tipo === 'equipe') curr.acessosEquipe++
    else curr.acessosClientes++

    const detExistente = curr.detalhesMap.get(info.chave)
    if (detExistente) {
      detExistente.acessos++
      if (new Date(f.created_at) > new Date(detExistente.ultimo_acesso)) {
        detExistente.ultimo_acesso = f.created_at
      }
    } else {
      curr.detalhesMap.set(info.chave, {
        chave: info.chave,
        usuario_nome: info.usuario_nome,
        usuario_detalhe: info.usuario_detalhe,
        empresa: info.empresa,
        tipo: info.tipo,
        acessos: 1,
        ultimo_acesso: f.created_at
      })
    }

    mapaFaq.set(key, curr)
    registrarAtividadeUsuario(info, f.created_at, 'faq')
  })

  // Contagem de Vídeos da Academia + lista detalhada de reproduções
  const videosInfoMap = new Map((videosCatalogo || []).map((v: any) => [v.id, v]))
  const mapaVideos = new Map<string, { id: string; titulo: string; instrutor: string; visualizacoes: number; concluidos: number }>()
  const detalhesVideosAssistidos: VideoVisualizacaoDetalhe[] = []

  ;(visualizacoesVideos || []).forEach((v: any, idx: number) => {
    const infoVideo = videosInfoMap.get(v.video_id)
    const key = v.video_id
    const curr = mapaVideos.get(key) || {
      id: v.video_id,
      titulo: infoVideo?.titulo || 'Vídeo de Treinamento',
      instrutor: infoVideo?.instrutor || 'Mantran',
      visualizacoes: 0,
      concluidos: 0
    }
    curr.visualizacoes++
    const concluido = !!(v.assistido || v.progresso_pct >= 90)
    if (concluido) {
      curr.concluidos++
    }
    mapaVideos.set(key, curr)

    const infoUser = identificarOrigem(v.usuario_chave, v.usuario_nome)
    const dataVideo = v.ultima_vez || v.created_at || new Date().toISOString()
    registrarAtividadeUsuario(infoUser, dataVideo, 'video')

    detalhesVideosAssistidos.push({
      id: v.id || `${v.video_id}-${idx}`,
      video_id: v.video_id,
      video_titulo: infoVideo?.titulo || 'Vídeo de Treinamento',
      instrutor: infoVideo?.instrutor || 'Mantran',
      usuario_nome: infoUser.usuario_nome,
      usuario_detalhe: infoUser.usuario_detalhe,
      empresa: infoUser.empresa,
      tipo: infoUser.tipo,
      progresso_pct: Number(v.progresso_pct || (concluido ? 100 : 0)),
      concluido,
      ultima_vez: dataVideo
    })
  })

  detalhesVideosAssistidos.sort((a, b) => new Date(b.ultima_vez).getTime() - new Date(a.ultima_vez).getTime())

  const usuariosAtivosLista: UsuarioAtivoResumo[] = Array.from(mapaUsuariosAtivos.values())
    .map(({ telasCount, ...u }) => ({
      ...u,
      totalInteracoes: u.acessosTelas + u.acessosFaq + u.videosAssistidos,
      principaisTelas: Array.from(telasCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nome, qtd]) => `${nome} (${qtd}x)`)
    }))
    .sort((a, b) => {
      if (b.totalInteracoes !== a.totalInteracoes) return b.totalInteracoes - a.totalInteracoes
      return new Date(b.ultimo_acesso).getTime() - new Date(a.ultimo_acesso).getTime()
    })

  // Clientes/usuários únicos (excluindo visitante anônimo da contagem de usuários logados se necessário, ou mantendo consistente com a lista)
  const usuariosAtivosLogados = usuariosAtivosLista.filter(u => u.tipo !== 'visitante')

  return {
    totalAcessos: (acessos || []).length,
    totalFaqLidos: (faqs || []).length,
    totalVideosAssistidos: (visualizacoesVideos || []).length,
    totalUsuariosAtivos: usuariosAtivosLogados.length,
    totalNovosUsuarios: novosUsuarios.length,
    novosUsuarios,
    usuariosAtivosLista,
    detalhesVideosAssistidos,
    topFaq: Array.from(mapaFaq.values())
      .map(({ detalhesMap, ...rest }) => ({
        ...rest,
        detalhes: Array.from(detalhesMap.values()).sort((a, b) => {
          if (b.acessos !== a.acessos) return b.acessos - a.acessos
          return new Date(b.ultimo_acesso).getTime() - new Date(a.ultimo_acesso).getTime()
        })
      }))
      .sort((a, b) => b.acessos - a.acessos)
      .slice(0, 15),
    topVideos: Array.from(mapaVideos.values()).sort((a, b) => b.visualizacoes - a.visualizacoes).slice(0, 15),
    topTelas: Array.from(mapaTelas.values()).sort((a, b) => b.acessos - a.acessos).slice(0, 15),
    topClientes: Array.from(mapaClientes.values()).sort((a, b) => b.acessos - a.acessos).slice(0, 15),
    historicoAcessos: Array.from(historicoMapa.entries())
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }
}
