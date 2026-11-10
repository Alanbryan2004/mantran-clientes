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

export interface AnalyticsResumo {
  totalAcessos: number
  totalFaqLidos: number
  totalVideosAssistidos: number
  totalUsuariosAtivos: number
  totalNovosUsuarios: number
  novosUsuarios: NovoUsuario[]
  topFaq: { id: string; titulo: string; categoria: string; acessos: number }[]
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

  // 1. Consultar acessos_log
  let queryAcessos = supabase.from('acessos_log').select('*')
  if (dataFiltro) queryAcessos = queryAcessos.gte('created_at', dataFiltro.toISOString())
  const { data: acessos = [] } = await queryAcessos

  // 2. Consultar faq_visualizacoes
  let queryFaq = supabase.from('faq_visualizacoes').select('*')
  if (dataFiltro) queryFaq = queryFaq.gte('created_at', dataFiltro.toISOString())
  const { data: faqs = [] } = await queryFaq

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
  })

  // Contagem de Manuais do FAQ
  const mapaFaq = new Map<string, { id: string; titulo: string; categoria: string; acessos: number }>()
  ;(faqs || []).forEach((f: FaqVisualizacaoItem) => {
    const key = f.procedimento_id || f.procedimento_titulo
    const curr = mapaFaq.get(key) || {
      id: f.procedimento_id,
      titulo: f.procedimento_titulo,
      categoria: f.categoria_nome || 'Geral',
      acessos: 0
    }
    curr.acessos++
    mapaFaq.set(key, curr)
  })

  // Contagem de Vídeos da Academia
  const videosInfoMap = new Map((videosCatalogo || []).map((v: any) => [v.id, v]))
  const mapaVideos = new Map<string, { id: string; titulo: string; instrutor: string; visualizacoes: number; concluidos: number }>()
  ;(visualizacoesVideos || []).forEach((v: any) => {
    const info = videosInfoMap.get(v.video_id)
    const key = v.video_id
    const curr = mapaVideos.get(key) || {
      id: v.video_id,
      titulo: info?.titulo || 'Vídeo de Treinamento',
      instrutor: info?.instrutor || 'Mantran',
      visualizacoes: 0,
      concluidos: 0
    }
    curr.visualizacoes++
    if (v.assistido || v.progresso_pct >= 90) {
      curr.concluidos++
    }
    mapaVideos.set(key, curr)
  })

  // Clientes/usuários únicos
  const usuariosUnicos = new Set([
    ...(acessos || []).map((a: any) => a.usuario_id || a.usuario_nome).filter(Boolean),
    ...(visualizacoesVideos || []).map((v: any) => v.usuario_chave || v.usuario_nome).filter(Boolean)
  ])

  return {
    totalAcessos: (acessos || []).length,
    totalFaqLidos: (faqs || []).length,
    totalVideosAssistidos: (visualizacoesVideos || []).length,
    totalUsuariosAtivos: usuariosUnicos.size,
    totalNovosUsuarios: novosUsuarios.length,
    novosUsuarios,
    topFaq: Array.from(mapaFaq.values()).sort((a, b) => b.acessos - a.acessos).slice(0, 15),
    topVideos: Array.from(mapaVideos.values()).sort((a, b) => b.visualizacoes - a.visualizacoes).slice(0, 15),
    topTelas: Array.from(mapaTelas.values()).sort((a, b) => b.acessos - a.acessos).slice(0, 15),
    topClientes: Array.from(mapaClientes.values()).sort((a, b) => b.acessos - a.acessos).slice(0, 15),
    historicoAcessos: Array.from(historicoMapa.entries())
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }
}
