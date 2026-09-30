// Função serverless (Vercel) para RECEBER e-mail e transformar em CHAMADO.
// Um serviço de inbound (ex.: Mailgun/SendGrid Inbound, ou um encaminhamento)
// faz um POST para cá quando chega um e-mail em chamado@mantran.com.br.
//
// Segurança: exige um token secreto (?token= ou header x-webhook-token) que
// deve bater com a variável de ambiente RECEBER_EMAIL_TOKEN.
//
// Corpo aceito (JSON) — campos flexíveis para casar com vários provedores:
//   remetente/from/sender   -> e-mail de quem enviou
//   nome/from_name          -> nome de quem enviou (opcional)
//   assunto/subject         -> assunto
//   corpo/text/body/html    -> conteúdo
//
// Regras:
//   - Se o assunto contém [#numero], adiciona como mensagem no chamado existente.
//   - Senão, cria um novo chamado com o remetente como cliente.
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL (ou VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY (recomendado) ou VITE_SUPABASE_ANON_KEY
//   RECEBER_EMAIL_TOKEN  (um segredo que você inventa)

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Extrai o primeiro e-mail de uma string (ex.: '"Fulano" <fulano@x.com>' -> 'fulano@x.com')
function extrairEmail(str?: string): string {
  if (!str) return ''
  const m = String(str).match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return m ? m[0].toLowerCase() : ''
}

// Extrai o número do chamado do assunto: "[#40123] ..." -> 40123
function extrairNumeroChamado(assunto?: string): number | null {
  if (!assunto) return null
  const m = String(assunto).match(/\[#(\d+)\]/)
  return m ? parseInt(m[1], 10) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido' })
    return
  }

  // Validação do token secreto
  const tokenEsperado = process.env.RECEBER_EMAIL_TOKEN
  const tokenRecebido = (req.query.token as string) || (req.headers['x-webhook-token'] as string) || ''
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    res.status(401).json({ ok: false, erro: 'Não autorizado.' })
    return
  }

  try {
    const body = (req.body || {}) as Record<string, any>
    const envelope = (body.envelope || {}) as Record<string, any>
    const headers = (body.headers || {}) as Record<string, any>

    // CloudMailin (JSON normalizado): remetente em envelope.from ou headers.from;
    // assunto em headers.subject; corpo em plain/html. Mantém fallback para outros formatos.
    const remetente = extrairEmail(
      envelope.from || headers.from || body.remetente || body.from || body.sender || body.From
    )
    const nomeBruto = (headers.from || body.nome || body.from_name || body.sender_name || '').toString()
    // Extrai o nome amigável de '"Fulano" <fulano@x.com>' se houver
    const nomeMatch = nomeBruto.match(/^\s*"?([^"<]+?)"?\s*</)
    const nome = (nomeMatch ? nomeMatch[1].trim() : '') || remetente
    const assunto = (headers.subject || body.assunto || body.subject || body.Subject || '(sem assunto)').toString().trim()
    const corpo = (
      body.plain || body.reply_plain || body.text || body.corpo || body.body ||
      body.html || body['body-plain'] || body['stripped-text'] || ''
    ).toString().trim()

    if (!remetente) {
      res.status(400).json({ ok: false, erro: 'Remetente não identificado.' })
      return
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ ok: false, erro: 'Supabase não configurado no servidor.' })
      return
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1) É resposta a um chamado existente? (assunto tem [#numero])
    const numero = extrairNumeroChamado(assunto)
    if (numero) {
      const { data: existente } = await supabase
        .from('tickets')
        .select('id, numero, titulo')
        .eq('numero', numero)
        .maybeSingle()

      if (existente) {
        await supabase.from('ticket_mensagens').insert({
          ticket_id: existente.id,
          tipo: 'cliente',
          conteudo: corpo || '(sem conteúdo)',
          autor_nome: nome,
          autor_tipo: 'cliente'
        })
        await supabase.from('tickets').update({ lido: false, status: 'Aberto', updated_at: new Date().toISOString() }).eq('id', existente.id)

        await supabase.from('notificacoes').insert({
          titulo: `💬 Resposta por e-mail no #${existente.numero}`,
          mensagem: `${nome} respondeu por e-mail no chamado "${existente.titulo}".`,
          tipo: 'ticket',
          lida: false
        })
        res.status(200).json({ ok: true, acao: 'mensagem_adicionada', ticket: existente.numero })
        return
      }
      // Se não achou o chamado do número, cai para criar um novo.
    }

    // 2) Cria um novo chamado
    // Tenta vincular a um contato existente por e-mail
    let contatoId: string | null = null
    try {
      const { data: ct } = await supabase
        .from('ticket_contatos')
        .select('id')
        .ilike('email', remetente)
        .maybeSingle()
      if (ct?.id) contatoId = ct.id
      else {
        // cria contato novo
        const { data: novoCt } = await supabase
          .from('ticket_contatos')
          .insert({ nome, email: remetente, ve_todos_empresa: false, ativo: true })
          .select('id')
          .single()
        contatoId = novoCt?.id || null
      }
    } catch (_) { /* segue sem contato */ }

    const { data: novo, error: errNovo } = await supabase
      .from('tickets')
      .insert({
        titulo: assunto,
        descricao: corpo || null,
        cliente_nome: nome,
        cliente_email: remetente,
        contato_id: contatoId,
        origem: 'email',
        status: 'Novo',
        prioridade: 'Média',
        lido: false
      })
      .select('id, numero')
      .single()

    if (errNovo) {
      res.status(500).json({ ok: false, erro: 'Erro ao criar chamado: ' + errNovo.message })
      return
    }

    await supabase.from('notificacoes').insert({
      titulo: `🎫 Novo chamado por e-mail de ${nome}`,
      mensagem: `${nome} abriu um chamado por e-mail: "${assunto}".`,
      tipo: 'ticket',
      lida: false
    })

    res.status(200).json({ ok: true, acao: 'chamado_criado', ticket: novo?.numero })
  } catch (err: any) {
    console.error('Erro ao receber e-mail:', err)
    res.status(500).json({ ok: false, erro: err?.message || 'Falha ao processar e-mail.' })
  }
}
