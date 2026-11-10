// Função serverless (Vercel) — ACESSO DE CONTATOS AO PORTAL.
//
// O login do cliente é o CONTATO da tela Tickets > Contatos, sempre vinculado a uma EMPRESA.
// O login é o próprio e-mail. Ninguém recebe senha por e-mail: a pessoa cria a sua.
//
// Ações (todas POST com JSON):
//   'liberar'       Botão "Liberar Acesso" (Suporte/Admin). Exige empresa vinculada ao contato.
//                   Envia ao e-mail do contato um link para criar a senha (vale 7 dias).
//   'redefinir'     Botão "Redefinir senha" (Suporte/Admin), para quem já tem acesso ativo.
//                   Envia link para criar nova senha (24h). A senha atual segue valendo até o uso.
//   'definir-senha' A pessoa abre o link do e-mail e grava a senha escolhida.
//   'cadastrar'     "Cadastre-se" na tela de login: CNPJ, nome, e-mail e senha. A empresa vem do CNPJ
//                   (tabela base_cnpjs). Cria um usuário INATIVO e envia link de confirmação (24h).
//   'confirmar'     Confirmação do e-mail: cria/vincula o contato à empresa e ativa o acesso.
//
// Variáveis de ambiente (Vercel):
//   SUPABASE_URL (ou VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY (recomendado) ou VITE_SUPABASE_ANON_KEY
//   CADASTRO_SECRET  -> (opcional) segredo que assina os links; se ausente, usa SUPABASE_SERVICE_ROLE_KEY
//   SITE_URL         -> (opcional) endereço público do site, ex.: https://clientes.mantran.com.br

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const VALIDADE_CONVITE_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias (primeiro acesso liberado pelo Suporte)
const VALIDADE_REDEFINICAO_MS = 24 * 60 * 60 * 1000 // 24 horas (redefinir senha)
const VALIDADE_CADASTRO_MS = 24 * 60 * 60 * 1000 // 24 horas (confirmar e-mail do autocadastro)

// ---------------------------------------------------------------------------
// Helpers puros (exportados para teste)
// ---------------------------------------------------------------------------
export function somenteDigitos(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

export function cnpjValido(valor: unknown): boolean {
  const c = somenteDigitos(valor)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const dv = (n: number) => {
    let soma = 0
    let peso = n - 7
    for (let i = 0; i < n; i++) {
      soma += Number(c[i]) * peso--
      if (peso < 2) peso = 9
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13])
}

export function emailValido(v: unknown): boolean {
  const e = String(v ?? '').trim()
  return e.length <= 254 && /^[^\s@,;<>()|]+@[^\s@,;<>()|]+\.[^\s@,;<>()|]{2,}$/.test(e)
}

// A senha escolhida precisa ser razoável e NÃO pode ser a senha padrão das bases (NNN@Mantran).
export function validarSenha(senha: string, email?: string): string | null {
  if (typeof senha !== 'string' || senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (senha.length > 72) return 'A senha deve ter no máximo 72 caracteres.'
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'A senha deve ter letras e números.'
  if (/^\d{1,4}@mantran$/i.test(senha)) return 'Escolha uma senha diferente da senha padrão da Mantran.'
  if (email && senha.toLowerCase() === email.toLowerCase()) return 'A senha não pode ser igual ao e-mail.'
  return null
}

// ---- Link assinado (stateless, HMAC-SHA256) ----
// u = id do usuário | e = e-mail (login) | x = expiração (ms) | v = marcador de uso único
// r = true: REDEFINIÇÃO de senha de acesso já ativo | c = id da empresa: link de CONFIRMAÇÃO do autocadastro
interface PayloadToken { u: string; e: string; x: number; v: string; r?: boolean; c?: string }

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')

// Marcador de uso único: resumo PROTEGIDO PELO SEGREDO do servidor (HMAC) da senha gravada no momento.
// Com HMAC, quem vir o link não consegue testar senhas "no escuro" a partir do marcador.
// Ao trocar/definir a senha o marcador muda e os links pendentes deixam de valer.
export function marcador(secret: string, valor: string): string {
  return createHmac('sha256', secret).update(`marcador:${String(valor)}`).digest('hex').slice(0, 16)
}

export function assinarToken(secret: string, p: PayloadToken): string {
  const corpo = b64u(JSON.stringify(p))
  return `${corpo}.${b64u(createHmac('sha256', secret).update(corpo).digest())}`
}

export function verificarToken(secret: string, token: string): PayloadToken | null {
  const [corpo, assin] = String(token || '').split('.')
  if (!corpo || !assin) return null
  const esperado = createHmac('sha256', secret).update(corpo).digest()
  let recebido: Buffer
  try { recebido = Buffer.from(assin, 'base64url') } catch { return null }
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null
  try {
    const p = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as PayloadToken
    if (!p || typeof p.u !== 'string' || typeof p.e !== 'string' || typeof p.x !== 'number' || typeof p.v !== 'string') return null
    if (p.r !== undefined && typeof p.r !== 'boolean') return null
    if (p.c !== undefined && typeof p.c !== 'string') return null
    return p
  } catch {
    return null
  }
}

export class ErroAcesso extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Acesso a dados
// ---------------------------------------------------------------------------
// ilike trata "_" e "%" como curinga; por isso confere de novo com igualdade exata em minúsculas.
async function usuariosComEmail(supabase: SupabaseClient, email: string) {
  const colunas = 'id, login, perfil, ativo, senha, email_corporativo, email_pessoal'
  const buscas = await Promise.all(['login', 'email_corporativo', 'email_pessoal'].map(col =>
    supabase.from('usuario').select(colunas).ilike(col, email)
  ))
  const mapa = new Map<string, any>()
  for (const b of buscas) {
    if (b.error) throw b.error
    for (const u of b.data || []) mapa.set(u.id, u)
  }
  return [...mapa.values()].filter(u =>
    [u.login, u.email_corporativo, u.email_pessoal].some(x => String(x || '').trim().toLowerCase() === email)
  )
}

export type ResultadoEmpresa =
  | { status: 'ok'; clienteId: string; empresaNome: string }
  | { status: 'nao_encontrado' }
  | { status: 'ambiguo' }

// CNPJ -> bases (base_cnpjs) -> clientes. Só considera clientes ativos.
export async function localizarEmpresaPorCnpj(supabase: SupabaseClient, cnpj: string): Promise<ResultadoEmpresa> {
  const { data: vinculos, error: e1 } = await supabase.from('base_cnpjs').select('nome_base').eq('cnpj', cnpj).eq('ativo', true)
  if (e1) throw e1
  const nomesBase = [...new Set((vinculos || []).map((v: any) => v.nome_base))]
  if (nomesBase.length === 0) return { status: 'nao_encontrado' }

  const { data: bases, error: e2 } = await supabase.from('bases').select('nome_base, cliente_id').in('nome_base', nomesBase)
  if (e2) throw e2
  const clienteIds = [...new Set((bases || []).map((b: any) => b.cliente_id).filter(Boolean))]
  if (clienteIds.length === 0) return { status: 'nao_encontrado' }

  const { data: clientes, error: e3 } = await supabase.from('clientes').select('id, nome_empresa, ativo').in('id', clienteIds)
  if (e3) throw e3
  const ativos = (clientes || []).filter((c: any) => c.ativo !== false)
  if (ativos.length === 0) return { status: 'nao_encontrado' }
  // Mesmo CNPJ em empresas diferentes: não escolhe sozinho (encaminha ao suporte)
  if (ativos.length > 1) return { status: 'ambiguo' }
  return { status: 'ok', clienteId: ativos[0].id, empresaNome: ativos[0].nome_empresa || '' }
}

// Contato (tela Contatos) da pessoa, sempre vinculado à empresa.
//  - já existe na mesma empresa: reaproveita;
//  - existe sem empresa: vincula (se criar = true);
//  - existe em OUTRA empresa: recusa (não "rouba" o contato);
//  - não existe: cria (se criar = true).
async function resolverContato(
  supabase: SupabaseClient,
  d: { email: string; nome: string; clienteId: string; empresaNome: string; criar: boolean }
): Promise<{ contatoId: string | null; criado: boolean }> {
  const { data: cands, error } = await supabase.from('ticket_contatos').select('id, email, empresa_id, ativo').ilike('email', d.email)
  if (error) throw error
  const existente = (cands || []).find((c: any) => String(c.email || '').trim().toLowerCase() === d.email)

  if (existente) {
    if (existente.ativo === false) throw new ErroAcesso(409, 'Este contato está inativo. Fale com o suporte da Mantran.')
    if (existente.empresa_id && existente.empresa_id !== d.clienteId) {
      throw new ErroAcesso(409, 'Este e-mail já está cadastrado em outra empresa. Fale com o suporte da Mantran.')
    }
    if (!existente.empresa_id && d.criar) {
      const { error: eUp } = await supabase.from('ticket_contatos').update({ empresa_id: d.clienteId, empresa_nome: d.empresaNome || null }).eq('id', existente.id)
      if (eUp) throw eUp
    }
    return { contatoId: existente.id, criado: false }
  }
  if (!d.criar) return { contatoId: null, criado: false }

  const { data, error: eIns } = await supabase
    .from('ticket_contatos')
    .insert({ nome: d.nome, email: d.email, empresa_id: d.clienteId, empresa_nome: d.empresaNome || null, ve_todos_empresa: false, ativo: true })
    .select('id')
    .single()
  if (eIns) throw eIns
  return { contatoId: data.id, criado: true }
}

// ---------------------------------------------------------------------------
// Liberar Acesso (Suporte/Admin)
// ---------------------------------------------------------------------------
interface ConviteGerado {
  usuarioId: string
  criado: boolean
  email: string
  nome: string
  empresa: string
  marcadorUso: string
}

// Parte "de banco" do botão Liberar Acesso (separada do envio do e-mail).
export async function prepararConvite(supabase: SupabaseClient, secret: string, contatoId: string): Promise<ConviteGerado> {
  const { data: contato, error } = await supabase
    .from('ticket_contatos')
    .select('id, nome, email, empresa_id, empresa_nome, ativo')
    .eq('id', contatoId)
    .maybeSingle()
  if (error) throw error
  if (!contato) throw new ErroAcesso(404, 'Contato não encontrado.')
  if (contato.ativo === false) throw new ErroAcesso(409, 'Este contato está inativo.')

  const email = String(contato.email || '').trim().toLowerCase()
  if (!emailValido(email)) {
    throw new ErroAcesso(400, 'O e-mail deste contato está vazio, inválido ou tem mais de um endereço. Ajuste o contato e tente de novo.')
  }

  // A EMPRESA é obrigatória: o acesso do cliente (chamados, Academia) depende dela.
  if (!contato.empresa_id) {
    throw new ErroAcesso(400, 'Informe a empresa deste contato (Editar contato) antes de liberar o acesso.')
  }
  const { data: cli, error: eCli } = await supabase.from('clientes').select('nome_empresa, ativo').eq('id', contato.empresa_id).maybeSingle()
  if (eCli) throw eCli
  if (!cli) {
    throw new ErroAcesso(400, 'A empresa vinculada a este contato não foi encontrada. Escolha a empresa novamente em Editar contato.')
  }
  const empresa = String(cli.nome_empresa || contato.empresa_nome || '')

  const existentes = await usuariosComEmail(supabase, email)
  if (existentes.some(u => u.perfil !== 'Cliente')) {
    throw new ErroAcesso(409, 'Este e-mail pertence a um usuário interno da Mantran e não pode receber acesso de cliente.')
  }
  if (existentes.some(u => u.ativo)) {
    throw new ErroAcesso(409, 'Este contato já tem acesso.')
  }

  // Segredo provisório: impossível de adivinhar e inútil para entrar (o usuário está inativo)
  const provisorio = randomBytes(24).toString('hex')
  const pendente = existentes[0]
  if (pendente) {
    const { error: eUp } = await supabase.from('usuario').update({ senha: provisorio, nome: contato.nome }).eq('id', pendente.id)
    if (eUp) throw eUp
    return { usuarioId: pendente.id, criado: false, email, nome: contato.nome, empresa, marcadorUso: marcador(secret, provisorio) }
  }

  const { data, error: eIns } = await supabase
    .from('usuario')
    .insert({
      nome: contato.nome,
      login: email,
      senha: provisorio,
      perfil: 'Cliente',
      ativo: false,
      e_tecnico: false,
      meta_semanal: 0,
      email_pessoal: email
    })
    .select('id')
    .single()
  if (eIns) throw eIns
  return { usuarioId: data.id, criado: true, email, nome: contato.nome, empresa, marcadorUso: marcador(secret, provisorio) }
}

// ---------------------------------------------------------------------------
// Redefinir senha (Suporte/Admin)
// ---------------------------------------------------------------------------
// NÃO mexe na senha atual: quem lembrar dela continua entrando até usar o link.
export async function prepararRedefinicao(
  supabase: SupabaseClient,
  secret: string,
  contatoId: string
): Promise<{ usuarioId: string; email: string; nome: string; marcadorUso: string }> {
  const { data: contato, error } = await supabase
    .from('ticket_contatos')
    .select('id, nome, email, ativo')
    .eq('id', contatoId)
    .maybeSingle()
  if (error) throw error
  if (!contato) throw new ErroAcesso(404, 'Contato não encontrado.')

  const email = String(contato.email || '').trim().toLowerCase()
  if (!emailValido(email)) {
    throw new ErroAcesso(400, 'O e-mail deste contato está vazio, inválido ou tem mais de um endereço. Ajuste o contato e tente de novo.')
  }

  const existentes = await usuariosComEmail(supabase, email)
  if (existentes.some(u => u.perfil !== 'Cliente')) {
    throw new ErroAcesso(409, 'Este e-mail pertence a um usuário interno da Mantran. A senha dele é gerenciada em Usuários.')
  }
  const ativo = existentes.find(u => u.ativo)
  if (!ativo) {
    throw new ErroAcesso(409, 'Este contato ainda não ativou o acesso. Use "Liberar Acesso" ou "Reenviar convite".')
  }
  return { usuarioId: ativo.id, email, nome: contato.nome, marcadorUso: marcador(secret, ativo.senha) }
}

// ---------------------------------------------------------------------------
// Pessoa cria a senha pelo link do e-mail (convite do Suporte ou redefinição)
// ---------------------------------------------------------------------------
//  - convite inicial: ativa o acesso (usuário ainda pendente);
//  - redefinição (r = true): só troca a senha de um acesso já ativo.
export async function definirSenha(
  supabase: SupabaseClient,
  secret: string,
  token: string,
  senha: string,
  confirmarSenha: string
): Promise<{ login: string; redefinicao: boolean }> {
  const p = verificarToken(secret, token)
  if (!p || p.c !== undefined || Date.now() > p.x) {
    throw new ErroAcesso(400, 'Link inválido ou expirado. Peça um novo link ao suporte da Mantran.')
  }
  if (senha !== confirmarSenha) throw new ErroAcesso(400, 'As senhas não conferem.')
  const erroSenha = validarSenha(senha, p.e)
  if (erroSenha) throw new ErroAcesso(400, erroSenha)

  const { data: u, error } = await supabase
    .from('usuario')
    .select('id, login, perfil, ativo, senha, email_pessoal')
    .eq('id', p.u)
    .maybeSingle()
  if (error) throw error

  const redefinicao = p.r === true
  const valido =
    !!u &&
    u.perfil === 'Cliente' &&
    String(u.login || '').toLowerCase() === p.e.toLowerCase() &&
    String(u.email_pessoal || '').toLowerCase() === p.e.toLowerCase() &&
    // convite só vale para quem ainda não ativou; redefinição só para quem já tem acesso ativo
    (redefinicao ? !!u.ativo : !u.ativo) &&
    marcador(secret, u.senha) === p.v // senha ainda é a mesma de quando o link foi emitido (uso único)
  if (!u || !valido) throw new ErroAcesso(400, 'Este link já foi usado ou foi substituído por um mais novo. Peça um novo link ao suporte da Mantran.')

  // Redefinição NÃO reativa conta: só troca a senha
  const { error: eUp } = await supabase
    .from('usuario')
    .update(redefinicao ? { senha } : { senha, ativo: true })
    .eq('id', u.id)
  if (eUp) throw eUp
  return { login: u.login, redefinicao }
}

// ---------------------------------------------------------------------------
// Autocadastro pela tela de login
// ---------------------------------------------------------------------------
export interface DadosCadastro { cnpj: string; nome: string; email: string; senha: string; confirmarSenha: string }

// Passo 1 do "Cadastre-se": o CNPJ precisa ser válido E pertencer a uma empresa cadastrada na Mantran
// (CNPJ -> base_cnpjs -> base -> cliente ativo). Usado pelo botão "Continuar" e de novo no envio final.
export async function validarCnpjDaEmpresa(
  supabase: SupabaseClient,
  cnpjBruto: unknown
): Promise<{ cnpj: string; clienteId: string; empresaNome: string }> {
  const cnpj = somenteDigitos(cnpjBruto)
  if (!cnpjValido(cnpj)) throw new ErroAcesso(400, 'CNPJ inválido. Confira os 14 números.')
  const empresa = await localizarEmpresaPorCnpj(supabase, cnpj)
  if (empresa.status === 'nao_encontrado') {
    throw new ErroAcesso(404, 'CNPJ não localizado. Confira o número ou fale com o suporte da Mantran.')
  }
  if (empresa.status === 'ambiguo') {
    throw new ErroAcesso(409, 'Não foi possível concluir o cadastro automaticamente para este CNPJ. Fale com o suporte da Mantran.')
  }
  return { cnpj, clienteId: empresa.clienteId, empresaNome: empresa.empresaNome }
}

// Valida, localiza a empresa pelo CNPJ e deixa o usuário PENDENTE (inativo) com a senha escolhida.
// Ainda NÃO cria o contato: isso só acontece depois que a pessoa confirmar o e-mail.
export async function iniciarCadastro(
  supabase: SupabaseClient,
  secret: string,
  dados: DadosCadastro,
  site: string
): Promise<{ usuarioId: string; criado: boolean; email: string; nome: string; empresaNome: string; link: string }> {
  const nome = String(dados.nome ?? '').trim().replace(/\s+/g, ' ')
  const email = String(dados.email ?? '').trim().toLowerCase()
  const senha = String(dados.senha ?? '')

  // A empresa vem sempre do CNPJ validado no servidor (mesmo que a tela já tenha conferido antes)
  const empresaCnpj = await validarCnpjDaEmpresa(supabase, dados.cnpj)
  const empresa = { clienteId: empresaCnpj.clienteId, empresaNome: empresaCnpj.empresaNome }

  if (nome.length < 2 || nome.length > 100) throw new ErroAcesso(400, 'Informe seu nome.')
  if (!emailValido(email)) throw new ErroAcesso(400, 'E-mail inválido.')
  if (senha !== String(dados.confirmarSenha ?? '')) throw new ErroAcesso(400, 'As senhas não conferem.')
  const erroSenha = validarSenha(senha, email)
  if (erroSenha) throw new ErroAcesso(400, erroSenha)

  const existentes = await usuariosComEmail(supabase, email)
  if (existentes.some(u => u.perfil !== 'Cliente')) {
    throw new ErroAcesso(409, 'Este e-mail pertence a um usuário interno da Mantran.')
  }
  if (existentes.some(u => u.ativo)) {
    throw new ErroAcesso(409, 'Este e-mail já possui acesso. Entre com ele ou peça ao suporte para redefinir a senha.')
  }
  // Confere já agora se o contato existe em OUTRA empresa (sem criar nada)
  await resolverContato(supabase, { email, nome, clienteId: empresa.clienteId, empresaNome: empresa.empresaNome, criar: false })

  let usuarioId: string
  let criado = false
  const pendente = existentes[0]
  if (pendente) {
    const { error } = await supabase.from('usuario').update({ nome, senha }).eq('id', pendente.id)
    if (error) throw error
    usuarioId = pendente.id
  } else {
    const { data, error } = await supabase
      .from('usuario')
      .insert({ nome, login: email, senha, perfil: 'Cliente', ativo: false, e_tecnico: false, meta_semanal: 0, email_pessoal: email })
      .select('id')
      .single()
    if (error) throw error
    usuarioId = data.id
    criado = true
  }

  const token = assinarToken(secret, { u: usuarioId, e: email, x: Date.now() + VALIDADE_CADASTRO_MS, v: marcador(secret, senha), c: empresa.clienteId })
  const link = `${site.replace(/\/+$/, '')}/confirmar-cadastro?t=${encodeURIComponent(token)}`
  return { usuarioId, criado, email, nome, empresaNome: empresa.empresaNome, link }
}

// E-mail confirmado: cria/vincula o contato à empresa e ativa o acesso.
export async function confirmarCadastro(
  supabase: SupabaseClient,
  secret: string,
  token: string
): Promise<{ login: string; jaConfirmado: boolean }> {
  const p = verificarToken(secret, token)
  if (!p || !p.c || Date.now() > p.x) throw new ErroAcesso(400, 'Link inválido ou expirado. Faça o cadastro novamente.')

  const { data: u, error } = await supabase
    .from('usuario')
    .select('id, nome, login, perfil, ativo, senha, email_pessoal')
    .eq('id', p.u)
    .maybeSingle()
  if (error) throw error

  const identidadeOk =
    !!u &&
    u.perfil === 'Cliente' &&
    String(u.login || '').toLowerCase() === p.e.toLowerCase() &&
    String(u.email_pessoal || '').toLowerCase() === p.e.toLowerCase() &&
    marcador(secret, u.senha) === p.v // a senha é a mesma do cadastro que gerou este link
  if (!u || !identidadeOk) {
    throw new ErroAcesso(400, 'Este link já foi usado ou foi substituído por um cadastro mais novo. Faça o cadastro novamente.')
  }
  if (u.ativo) return { login: u.login, jaConfirmado: true } // segundo clique

  const email = p.e.toLowerCase()
  const outros = (await usuariosComEmail(supabase, email)).filter(x => x.id !== u.id)
  if (outros.some(x => x.perfil !== 'Cliente' || x.ativo)) {
    throw new ErroAcesso(409, 'Este e-mail já possui acesso. Entre com ele ou fale com o suporte.')
  }

  const { data: cli, error: eCli } = await supabase.from('clientes').select('id, nome_empresa, ativo').eq('id', p.c).maybeSingle()
  if (eCli) throw eCli
  if (!cli || cli.ativo === false) throw new ErroAcesso(409, 'A empresa deste cadastro não está mais ativa. Fale com o suporte da Mantran.')

  const contato = await resolverContato(supabase, { email, nome: u.nome, clienteId: cli.id, empresaNome: cli.nome_empresa || '', criar: true })

  const { error: eUp } = await supabase.from('usuario').update({ ativo: true }).eq('id', u.id)
  if (eUp) {
    if (contato.criado && contato.contatoId) await supabase.from('ticket_contatos').delete().eq('id', contato.contatoId)
    throw eUp
  }
  return { login: u.login, jaConfirmado: false }
}

// ---------------------------------------------------------------------------
// E-mail (mesmo SMTP configurado em Admin → E-mail, tabela config_email)
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function criarTransporte(supabase: SupabaseClient) {
  const { data: cfg, error } = await supabase.from('config_email').select('*').eq('id', 'default').maybeSingle()
  if (error) throw error
  if (!cfg || !cfg.smtp_host || !cfg.smtp_usuario || !cfg.smtp_senha) throw new Error('Configuração de SMTP incompleta.')

  const seguranca = String(cfg.smtp_seguranca || 'STARTTLS').toUpperCase()
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_porta) || 587,
    secure: seguranca === 'SSL',
    auth: { user: cfg.smtp_usuario, pass: cfg.smtp_senha },
    tls: seguranca === 'STARTTLS' ? { ciphers: 'TLSv1.2' } : undefined
  })
  const from = `"${cfg.remetente_nome || 'Suporte'}" <${cfg.remetente_email || cfg.smtp_usuario}>`
  return {
    enviar: (m: { to: string; subject: string; text: string; html: string }) => transporter.sendMail({ from, ...m })
  }
}

const botao = (link: string, rotulo: string) =>
  `<p style="margin:24px 0"><a href="${esc(link)}" style="background:#8b0000;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">${esc(rotulo)}</a></p>`
const caixaLogin = (email: string) =>
  `<p style="font-size:16px;font-weight:bold;background:#f1f5f9;padding:10px 14px;border-radius:6px;display:inline-block">${esc(email)}</p>`
const moldura = (titulo: string, corpo: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b"><h2 style="color:#8b0000;margin:0 0 12px">${esc(titulo)}</h2>${corpo}</div>`

async function enviarEmailConvite(supabase: SupabaseClient, d: { para: string; nome: string; empresa: string; link: string }) {
  const t = await criarTransporte(supabase)
  const empresaTxt = d.empresa ? ` para a empresa <strong>${esc(d.empresa)}</strong>` : ''
  const html = moldura('Seu acesso ao Mantran Clientes',
    `<p>Olá, ${esc(d.nome)}!</p>
     <p>A Mantran liberou o seu acesso ao <strong>Mantran Clientes</strong>${empresaTxt}. Para começar, crie a sua senha:</p>
     ${botao(d.link, 'Criar minha senha')}
     <p>Seu login é o seu e-mail:</p>${caixaLogin(d.para)}
     <p style="font-size:12px;color:#64748b">O link vale por 7 dias e só pode ser usado uma vez. Se você não reconhece este e-mail, ignore esta mensagem e nada será ativado.</p>`)
  const texto = `Olá, ${d.nome}!\n\nA Mantran liberou o seu acesso ao Mantran Clientes${d.empresa ? ` para a empresa ${d.empresa}` : ''}.\n` +
    `Para criar a sua senha, abra o link (vale por 7 dias, uso único):\n${d.link}\n\nSeu login é o seu e-mail: ${d.para}\n\nSe você não reconhece este e-mail, ignore esta mensagem.`
  await t.enviar({ to: d.para, subject: 'Seu acesso ao Mantran Clientes', text: texto, html })
}

async function enviarEmailRedefinicao(supabase: SupabaseClient, d: { para: string; nome: string; link: string }) {
  const t = await criarTransporte(supabase)
  const html = moldura('Redefinição de senha',
    `<p>Olá, ${esc(d.nome)}!</p>
     <p>A equipe da Mantran enviou este link para você criar uma <strong>nova senha</strong> de acesso ao <strong>Mantran Clientes</strong>:</p>
     ${botao(d.link, 'Criar nova senha')}
     <p>Seu login continua sendo o seu e-mail:</p>${caixaLogin(d.para)}
     <p style="font-size:12px;color:#64748b">O link vale por 24 horas e só pode ser usado uma vez. Se você não pediu isso, ignore esta mensagem: a sua senha atual continua valendo.</p>`)
  const texto = `Olá, ${d.nome}!\n\nA equipe da Mantran enviou este link para você criar uma nova senha de acesso ao Mantran Clientes (vale por 24 horas, uso único):\n${d.link}\n\n` +
    `Seu login continua sendo o seu e-mail: ${d.para}\n\nSe você não pediu isso, ignore esta mensagem: a sua senha atual continua valendo.`
  await t.enviar({ to: d.para, subject: 'Redefinição de senha - Mantran Clientes', text: texto, html })
}

async function enviarEmailConfirmacao(supabase: SupabaseClient, d: { para: string; nome: string; empresa: string; link: string }) {
  const t = await criarTransporte(supabase)
  const html = moldura('Confirme seu cadastro',
    `<p>Olá, ${esc(d.nome)}!</p>
     <p>Recebemos um pedido de cadastro no <strong>Mantran Clientes</strong> para a empresa <strong>${esc(d.empresa)}</strong>. Para ativar o seu acesso, confirme o seu e-mail:</p>
     ${botao(d.link, 'Confirmar meu cadastro')}
     <p>Depois de confirmar, entre com o seu e-mail como login e a senha que você criou no cadastro:</p>${caixaLogin(d.para)}
     <p style="font-size:12px;color:#64748b">O link vale por 24 horas. Se você não fez este cadastro, ignore esta mensagem e nada será ativado.</p>`)
  const texto = `Olá, ${d.nome}!\n\nRecebemos um pedido de cadastro no Mantran Clientes para a empresa ${d.empresa}.\n` +
    `Para ativar o seu acesso, abra o link (vale por 24 horas):\n${d.link}\n\nDepois de confirmar, entre com o seu e-mail (${d.para}) e a senha que você criou no cadastro.\n\nSe você não fez este cadastro, ignore esta mensagem.`
  await t.enviar({ to: d.para, subject: 'Confirme seu cadastro - Mantran Clientes', text: texto, html })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido.' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const secret = process.env.CADASTRO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey || !secret) {
    console.error('Acesso de contatos: variáveis de ambiente ausentes (SUPABASE_URL, chave do Supabase e CADASTRO_SECRET).')
    res.status(500).json({ ok: false, erro: 'Serviço indisponível no momento. Fale com o suporte.' })
    return
  }

  let body: any = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}

  const supabase = createClient(supabaseUrl, supabaseKey)
  const site = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/+$/, '')

  try {
    switch (body.acao) {
      // ----------------------- Pessoa cria a senha pelo link do e-mail -----------------------
      case 'definir-senha': {
        const r = await definirSenha(supabase, secret, String(body.token || ''), String(body.senha ?? ''), String(body.confirmarSenha ?? ''))
        res.status(200).json({ ok: true, login: r.login, redefinicao: r.redefinicao })
        return
      }

      // ----------------------- Botão "Liberar Acesso" -----------------------
      case 'liberar': {
        const contatoId = String(body.contatoId || '')
        if (!contatoId) { res.status(400).json({ ok: false, erro: 'Contato não informado.' }); return }

        const convite = await prepararConvite(supabase, secret, contatoId)
        const token = assinarToken(secret, { u: convite.usuarioId, e: convite.email, x: Date.now() + VALIDADE_CONVITE_MS, v: convite.marcadorUso })
        const link = `${site}/definir-senha?t=${encodeURIComponent(token)}`
        try {
          await enviarEmailConvite(supabase, { para: convite.email, nome: convite.nome, empresa: convite.empresa, link })
        } catch (e) {
          console.error('Acesso de contatos: falha ao enviar e-mail:', e)
          // Não deixa um usuário "órfão" (sem e-mail enviado) para trás
          if (convite.criado) await supabase.from('usuario').delete().eq('id', convite.usuarioId)
          res.status(502).json({ ok: false, erro: 'Não foi possível enviar o e-mail. Verifique a configuração de e-mail e tente novamente.' })
          return
        }
        res.status(200).json({ ok: true, estado: 'pendente', email: convite.email })
        return
      }

      // ----------------------- Botão "Redefinir senha" -----------------------
      case 'redefinir': {
        const contatoId = String(body.contatoId || '')
        if (!contatoId) { res.status(400).json({ ok: false, erro: 'Contato não informado.' }); return }

        const pedido = await prepararRedefinicao(supabase, secret, contatoId)
        const token = assinarToken(secret, { u: pedido.usuarioId, e: pedido.email, x: Date.now() + VALIDADE_REDEFINICAO_MS, v: pedido.marcadorUso, r: true })
        const link = `${site}/definir-senha?t=${encodeURIComponent(token)}`
        try {
          await enviarEmailRedefinicao(supabase, { para: pedido.email, nome: pedido.nome, link })
        } catch (e) {
          console.error('Acesso de contatos: falha ao enviar e-mail de redefinição:', e)
          res.status(502).json({ ok: false, erro: 'Não foi possível enviar o e-mail. Verifique a configuração de e-mail e tente novamente.' })
          return
        }
        res.status(200).json({ ok: true, email: pedido.email })
        return
      }

      // ----------------------- "Cadastre-se" passo 1: o CNPJ é de uma empresa da Mantran? -----------------------
      case 'validar-cnpj': {
        const e = await validarCnpjDaEmpresa(supabase, body.cnpj)
        res.status(200).json({ ok: true, empresa: e.empresaNome })
        return
      }

      // ----------------------- "Cadastre-se" na tela de login -----------------------
      case 'cadastrar': {
        // Campo-isca invisível no formulário: robôs preenchem, pessoas não.
        if (body.website) { res.status(200).json({ ok: true }); return }

        const c = await iniciarCadastro(supabase, secret, {
          cnpj: body.cnpj, nome: body.nome, email: body.email, senha: String(body.senha ?? ''), confirmarSenha: String(body.confirmarSenha ?? '')
        }, site)
        try {
          await enviarEmailConfirmacao(supabase, { para: c.email, nome: c.nome, empresa: c.empresaNome, link: c.link })
        } catch (e) {
          console.error('Autocadastro: falha ao enviar e-mail:', e)
          // Não deixa um cadastro "órfão" (sem e-mail de confirmação) para trás
          if (c.criado) await supabase.from('usuario').delete().eq('id', c.usuarioId)
          res.status(502).json({ ok: false, erro: 'Não foi possível enviar o e-mail de confirmação. Tente novamente em instantes.' })
          return
        }
        res.status(200).json({ ok: true, mensagem: 'Enviamos um e-mail de confirmação. Abra a mensagem e clique no link para ativar seu acesso.' })
        return
      }

      // ----------------------- Confirmação do e-mail do autocadastro -----------------------
      case 'confirmar': {
        const r = await confirmarCadastro(supabase, secret, String(body.token || ''))
        res.status(200).json({ ok: true, login: r.login, jaConfirmado: r.jaConfirmado })
        return
      }

      default:
        res.status(400).json({ ok: false, erro: 'Requisição inválida.' })
    }
  } catch (e: any) {
    if (e instanceof ErroAcesso) {
      res.status(e.status).json({ ok: false, erro: e.message })
      return
    }
    console.error('Erro em acesso-contato:', e)
    res.status(500).json({ ok: false, erro: 'Não foi possível concluir agora. Tente novamente ou fale com o suporte.' })
  }
}
