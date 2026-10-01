// Função serverless (Vercel) para ENVIAR e-mail via SMTP configurado no Admin.
// Roda no servidor — a senha do e-mail nunca trafega/roda no navegador.
//
// Espera um POST com JSON:
//   { para: string, assunto: string, html?: string, texto?: string }
// Lê a configuração de SMTP da tabela config_email (Supabase).
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL                (ou VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (recomendado) ou VITE_SUPABASE_ANON_KEY

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido' })
    return
  }

  try {
    const { para, assunto, html, texto, cc, anexos } = (req.body || {}) as {
      para?: string; assunto?: string; html?: string; texto?: string; cc?: string
      anexos?: { nome: string; tipo?: string; conteudo: string }[]
    }

    if (!para || !assunto) {
      res.status(400).json({ ok: false, erro: 'Informe "para" e "assunto".' })
      return
    }

    // Monta os anexos para o nodemailer a partir das Data URLs (data:tipo;base64,xxxx)
    const attachments = (Array.isArray(anexos) ? anexos : [])
      .map(a => {
        const m = String(a.conteudo || '').match(/^data:([^;]+);base64,(.*)$/)
        if (!m) return null
        return { filename: a.nome || 'anexo', content: m[2], encoding: 'base64' as const, contentType: a.tipo || m[1] }
      })
      .filter(Boolean) as { filename: string; content: string; encoding: 'base64'; contentType: string }[]

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ ok: false, erro: 'Supabase não configurado no servidor.' })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: cfg, error } = await supabase
      .from('config_email')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    if (error) {
      res.status(500).json({ ok: false, erro: 'Erro ao ler configuração: ' + error.message })
      return
    }
    if (!cfg || !cfg.smtp_host || !cfg.smtp_usuario || !cfg.smtp_senha) {
      res.status(400).json({ ok: false, erro: 'Configuração de SMTP incompleta. Preencha em Admin → E-mail.' })
      return
    }

    const seguranca = (cfg.smtp_seguranca || 'STARTTLS').toUpperCase()
    const porta = Number(cfg.smtp_porta) || 587

    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: porta,
      secure: seguranca === 'SSL', // true para 465 (SSL); false para 587 (STARTTLS)
      auth: { user: cfg.smtp_usuario, pass: cfg.smtp_senha },
      tls: seguranca === 'STARTTLS' ? { ciphers: 'TLSv1.2' } : undefined
    })

    const remetenteEmail = cfg.remetente_email || cfg.smtp_usuario
    const remetenteNome = cfg.remetente_nome || 'Suporte'

    await transporter.sendMail({
      from: `"${remetenteNome}" <${remetenteEmail}>`,
      to: para,
      cc: cc && cc.trim() ? cc : undefined,
      subject: assunto,
      text: texto || undefined,
      html: html || undefined,
      attachments: attachments.length ? attachments : undefined
    })

    res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('Erro ao enviar e-mail:', err)
    res.status(500).json({ ok: false, erro: err?.message || 'Falha ao enviar e-mail.' })
  }
}
