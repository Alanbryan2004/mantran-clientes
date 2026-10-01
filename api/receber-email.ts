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
import nodemailer from 'nodemailer'

// Extrai o primeiro e-mail de uma string (ex.: '"Fulano" <fulano@x.com>' -> 'fulano@x.com')
function extrairEmail(str?: string): string {
  if (!str) return ''
  const m = String(str).match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return m ? m[0].toLowerCase() : ''
}

// Converte HTML em texto legível (remove tags, estilos e scripts). Fallback para respostas.
function htmlParaTexto(html?: string): string {
  if (!html) return ''
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Extrai o número do chamado do assunto: "[#40123] ..." -> 40123
function extrairNumeroChamado(assunto?: string): number | null {
  if (!assunto) return null
  const m = String(assunto).match(/\[#(\d+)\]/)
  return m ? parseInt(m[1], 10) : null
}

const MAX_ANEXO = 4 * 1024 * 1024 // 4 MB por anexo (limite prudente para Data URL no banco)

function isInline(a: any): boolean {
  const disp = String(a.disposition || '').toLowerCase()
  return disp === 'inline' || !!a.content_id
}

// Monta o corpo do chamado (preferindo HTML) e embute as imagens coladas (inline) no lugar dos cid:.
// Retorna o corpo final e a lista de anexos que NÃO são inline (para virarem anexos do chamado).
function montarCorpoEAnexos(html: string, plain: string, anexos: any[]): { corpo: string; anexosArquivo: any[] } {
  let corpo = (html || '').trim()
  const usouHtml = corpo.length > 0
  if (!usouHtml) corpo = (plain || '').trim()

  const anexosArquivo: any[] = []

  for (const a of anexos) {
    if (isInline(a) && a.content && usouHtml) {
      // Embute a imagem inline no HTML, trocando o cid: pela Data URL
      const tipo = a.content_type || a.type || 'image/png'
      const base64 = String(a.content).replace(/\s/g, '')
      const bytes = Math.floor(base64.length * 0.75)
      if (bytes > MAX_ANEXO) { anexosArquivo.push(a); continue }
      const dataUrl = `data:${tipo};base64,${base64}`
      const cid = String(a.content_id || '').replace(/[<>]/g, '')
      if (cid && corpo.includes(`cid:${cid}`)) {
        corpo = corpo.split(`cid:${cid}`).join(dataUrl)
      } else {
        // Sem cid correspondente no HTML: anexa a imagem ao final do corpo
        corpo += `<br><img src="${dataUrl}" style="max-width:100%" />`
      }
    } else {
      anexosArquivo.push(a)
    }
  }

  return { corpo, anexosArquivo }
}

// Envia o e-mail de confirmação de abertura do chamado para o cliente.
// Usa a mesma configuração SMTP do Admin (config_email). Falha de envio não quebra o fluxo.
async function enviarConfirmacao(supabase: any, para: string, numero: number, assunto: string) {
  try {
    const { data: cfg } = await supabase.from('config_email').select('*').eq('id', 'default').maybeSingle()
    if (!cfg || !cfg.smtp_host || !cfg.smtp_usuario || !cfg.smtp_senha) return

    const seguranca = (cfg.smtp_seguranca || 'STARTTLS').toUpperCase()
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: Number(cfg.smtp_porta) || 587,
      secure: seguranca === 'SSL',
      auth: { user: cfg.smtp_usuario, pass: cfg.smtp_senha },
      tls: seguranca === 'STARTTLS' ? { ciphers: 'TLSv1.2' } : undefined
    })

    const remetenteEmail = cfg.remetente_email || cfg.smtp_usuario
    const remetenteNome = cfg.remetente_nome || 'Suporte Mantran'
    const assuntoResp = `[#${numero}] ${assunto}`
    const appUrl = (process.env.APP_URL || 'https://mantran-clientes-five.vercel.app').replace(/\/$/, '')
    const linkChamado = `${appUrl}/tickets?chamado=${numero}`
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;line-height:1.6;max-width:600px">
        <p>Olá,</p>
        <p>Recebemos a sua solicitação e abrimos o chamado abaixo. Nossa equipe já foi notificada e irá atendê-lo em breve.</p>
        <div style="margin:20px 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:bold">Número do chamado</p>
          <p style="margin:0 0 12px;font-size:20px;font-weight:bold;color:#dc2626">#${numero}</p>
          <p style="margin:0 0 14px;font-size:14px;color:#334155">${assunto}</p>
          <a href="${linkChamado}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:10px">
            Acompanhar meu chamado
          </a>
        </div>
        <p style="font-size:13px;color:#64748b">Para dar continuidade, basta <b>responder a este e-mail</b> mantendo o assunto (com o <b>#${numero}</b>), ou acompanhe pelo portal no link acima. Guarde este número para acompanhar o seu atendimento.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="font-size:12px;color:#94a3b8;margin:0">${remetenteNome}</p>
      </div>`

    await transporter.sendMail({
      from: `"${remetenteNome}" <${remetenteEmail}>`,
      to: para,
      subject: assuntoResp,
      html,
      text: `Recebemos a sua solicitação e abrimos o chamado #${numero} - ${assunto}. Acompanhe pelo portal: ${linkChamado} . Para dar continuidade, responda a este e-mail mantendo o assunto (com o #${numero}).`
    })
  } catch (err) {
    console.warn('Falha ao enviar confirmação de abertura:', err)
  }
}

// Salva anexos "de arquivo" (não inline) como anexos do chamado. Ignora anexos maiores que ~4 MB.
async function salvarAnexos(supabase: any, ticketId: string, mensagemId: string | null, anexos: any[]) {
  for (const a of anexos) {
    try {
      const nome = a.file_name || a.filename || a.name || 'anexo'
      const tipo = a.content_type || a.type || 'application/octet-stream'
      let arquivoUrl = ''
      let tamanho = Number(a.size) || 0

      if (a.content) {
        const base64 = String(a.content).replace(/\s/g, '')
        const bytes = Math.floor(base64.length * 0.75)
        if (bytes > MAX_ANEXO) continue
        arquivoUrl = `data:${tipo};base64,${base64}`
        if (!tamanho) tamanho = bytes
      } else if (a.url) {
        arquivoUrl = String(a.url)
      } else {
        continue
      }

      await supabase.from('ticket_anexos').insert({
        ticket_id: ticketId,
        mensagem_id: mensagemId,
        arquivo_nome: nome,
        arquivo_tipo: tipo,
        arquivo_url: arquivoUrl,
        tamanho_bytes: tamanho || null
      })
    } catch (_) { /* ignora anexo com erro e segue */ }
  }
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
    const htmlBruto = (body.html || body['body-html'] || '').toString()
    const plainBruto = (body.plain || body.reply_plain || body.text || body.corpo || body.body || body['body-plain'] || body['stripped-text'] || '').toString()

    // Texto LIMPO para respostas na thread (sem HTML/lixo do Outlook).
    // Prioriza reply_plain (resposta extraída pelo CloudMailin, sem a conversa citada).
    const textoLimpoBruto = (body.reply_plain || body.plain || body['stripped-text'] || '').toString()
    const textoLimpo = (textoLimpoBruto.trim() || htmlParaTexto(plainBruto || htmlBruto)).trim()

    // Anexos (CloudMailin embedded: content em base64; ou url se usar attachment store)
    const anexosRaw: any[] = Array.isArray(body.attachments) ? body.attachments : []

    if (!remetente) {
      res.status(400).json({ ok: false, erro: 'Remetente não identificado.' })
      return
    }

    // Monta o corpo (embute imagens coladas/inline) e separa os anexos "de arquivo"
    const { corpo, anexosArquivo } = montarCorpoEAnexos(htmlBruto, plainBruto, anexosRaw)

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
        const { data: msg } = await supabase.from('ticket_mensagens').insert({
          ticket_id: existente.id,
          tipo: 'cliente',
          conteudo: textoLimpo || '(sem conteúdo)',
          autor_nome: nome,
          autor_tipo: 'cliente'
        }).select('id').single()
        if (anexosArquivo.length) await salvarAnexos(supabase, existente.id, msg?.id || null, anexosArquivo)
        await supabase.from('tickets').update({ lido: false, status: 'Aberto', updated_at: new Date().toISOString() }).eq('id', existente.id)

        await supabase.from('notificacoes').insert({
          titulo: `💬 Resposta por e-mail no #${existente.numero}`,
          mensagem: `${nome} respondeu por e-mail no chamado "${existente.titulo}".`,
          tipo: 'ticket',
          lida: false,
          dados_extras: {
            ticket_id: existente.id,
            ticket_numero: existente.numero,
            cliente_nome: nome,
            modulo: 'tickets'
          }
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

    // Anexos "de arquivo" do e-mail -> anexos do chamado (imagens inline já foram embutidas no corpo)
    if (anexosArquivo.length && novo?.id) {
      await salvarAnexos(supabase, novo.id, null, anexosArquivo)
    }

    await supabase.from('notificacoes').insert({
      titulo: `🎫 Novo chamado por e-mail de ${nome}`,
      mensagem: `${nome} abriu um chamado por e-mail: "${assunto}".`,
      tipo: 'ticket',
      lida: false,
      dados_extras: {
        ticket_id: novo.id,
        ticket_numero: novo.numero,
        cliente_nome: nome,
        modulo: 'tickets'
      }
    })

    // Confirmação de abertura para o cliente, com o número do chamado
    if (novo?.numero) {
      await enviarConfirmacao(supabase, remetente, novo.numero, assunto)
    }

    res.status(200).json({ ok: true, acao: 'chamado_criado', ticket: novo?.numero })
  } catch (err: any) {
    console.error('Erro ao receber e-mail:', err)
    res.status(500).json({ ok: false, erro: err?.message || 'Falha ao processar e-mail.' })
  }
}
