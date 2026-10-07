// Função serverless (Vercel) — WORKER DE LEMBRETES DO CALENDÁRIO
//
// Varre a tabela calendario_lembretes buscando lembretes cujo horário de disparo
// (disparar_em) já chegou e que ainda não foram enviados (enviado = false), e envia
// um e-mail de lembrete para cada convidado. Em seguida, marca o lembrete como enviado.
//
// Pode ser chamado de duas formas:
//   1) Automaticamente por um Vercel Cron (configurado em vercel.json), ex: a cada 5 min.
//   2) Manualmente via GET/POST para teste.
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL                (ou VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (recomendado) ou VITE_SUPABASE_ANON_KEY
//   CRON_SECRET                 (opcional) — se definido, exige header "Authorization: Bearer <CRON_SECRET>"
//
// Observação: a notificação IN-APP (sininho) é calculada no cliente em tempo real;
// este worker cobre o caso do usuário OFFLINE, avisando por e-mail.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Formata data/hora para pt-BR (horário de Brasília)
function fmtDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function montarHtml(evento: any, dataHoraFmt: string): string {
  const linhasExtra: string[] = []
  if (evento.local) linhasExtra.push(`<p style="margin:4px 0;color:#334155"><strong>Local/Link:</strong> ${escapeHtml(evento.local)}</p>`)
  if (evento.descricao) linhasExtra.push(`<p style="margin:12px 0 0;color:#475569;white-space:pre-wrap">${escapeHtml(evento.descricao)}</p>`)

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#ef4444;padding:16px 20px;color:#fff">
      <h2 style="margin:0;font-size:18px">📅 Lembrete de evento</h2>
    </div>
    <div style="padding:20px">
      <h3 style="margin:0 0 8px;color:#0f172a;font-size:17px">${escapeHtml(evento.titulo)}</h3>
      <p style="margin:4px 0;color:#334155"><strong>Quando:</strong> ${dataHoraFmt}</p>
      ${linhasExtra.join('\n')}
      <p style="margin:18px 0 0;color:#94a3b8;font-size:12px">Você está recebendo este lembrete porque é participante deste evento na Agenda Mantran.</p>
    </div>
  </div>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Proteção opcional por segredo (recomendado para o cron)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ ok: false, erro: 'Não autorizado.' })
      return
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ ok: false, erro: 'Supabase não configurado no servidor.' })
      return
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1) Busca os lembretes vencidos e ainda não enviados (limite de segurança por execução)
    const agoraISO = new Date().toISOString()
    const { data: lembretes, error: errLemb } = await supabase
      .from('calendario_lembretes')
      .select('*')
      .eq('enviado', false)
      .lte('disparar_em', agoraISO)
      .order('disparar_em', { ascending: true })
      .limit(100)

    if (errLemb) {
      res.status(500).json({ ok: false, erro: 'Erro ao buscar lembretes: ' + errLemb.message })
      return
    }
    if (!lembretes || lembretes.length === 0) {
      res.status(200).json({ ok: true, enviados: 0, mensagem: 'Nenhum lembrete pendente.' })
      return
    }

    // 2) Carrega a configuração de SMTP (mesma usada no envio de tickets)
    const { data: cfg, error: errCfg } = await supabase
      .from('config_email')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    if (errCfg || !cfg || !cfg.smtp_host || !cfg.smtp_usuario || !cfg.smtp_senha) {
      res.status(400).json({ ok: false, erro: 'Configuração de SMTP incompleta (Admin → E-mail).' })
      return
    }

    const seguranca = (cfg.smtp_seguranca || 'STARTTLS').toUpperCase()
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: Number(cfg.smtp_porta) || 587,
      secure: seguranca === 'SSL',
      auth: { user: cfg.smtp_usuario, pass: cfg.smtp_senha },
      tls: seguranca === 'STARTTLS' ? { ciphers: 'TLSv1.2' } : undefined
    })
    const remetenteEmail = cfg.remetente_email || cfg.smtp_usuario
    const remetenteNome = cfg.remetente_nome || 'Agenda Mantran'

    // 3) Carrega os eventos relacionados de uma vez
    const eventoIds = Array.from(new Set(lembretes.map(l => l.evento_id)))
    const { data: eventos } = await supabase
      .from('calendario_eventos')
      .select('id, titulo, descricao, local, inicio, dia_inteiro')
      .in('id', eventoIds)
    const eventoPorId = new Map((eventos || []).map(e => [e.id, e]))

    // 4) Dispara os e-mails
    const idsEnviados: string[] = []
    const falhas: Array<{ id: string; erro: string }> = []

    for (const lem of lembretes) {
      const evento = eventoPorId.get(lem.evento_id)
      // Evento removido => marca como enviado (não há o que lembrar)
      if (!evento) { idsEnviados.push(lem.id); continue }
      // Sem e-mail do convidado => não há como enviar; marca para não reprocessar
      if (!lem.usuario_email) { idsEnviados.push(lem.id); continue }

      try {
        const dataHoraFmt = evento.dia_inteiro
          ? new Date(evento.inicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' (dia inteiro)'
          : fmtDataHora(evento.inicio)

        await transporter.sendMail({
          from: `"${remetenteNome}" <${remetenteEmail}>`,
          to: lem.usuario_email,
          subject: `📅 Lembrete: ${evento.titulo} — ${dataHoraFmt}`,
          html: montarHtml(evento, dataHoraFmt)
        })
        idsEnviados.push(lem.id)
      } catch (e: any) {
        falhas.push({ id: lem.id, erro: e?.message || 'falha no envio' })
      }
    }

    // 5) Marca os enviados
    if (idsEnviados.length) {
      await supabase
        .from('calendario_lembretes')
        .update({ enviado: true, enviado_em: new Date().toISOString() })
        .in('id', idsEnviados)
    }

    res.status(200).json({
      ok: true,
      processados: lembretes.length,
      enviados: idsEnviados.length,
      falhas: falhas.length,
      detalheFalhas: falhas
    })
  } catch (err: any) {
    console.error('Erro no worker de lembretes:', err)
    res.status(500).json({ ok: false, erro: err?.message || 'Falha no worker de lembretes.' })
  }
}
