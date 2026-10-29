// Endpoint público de DESCADASTRO (opt-out) de e-mails em massa.
// O link de descadastro incluído nos e-mails aponta para cá:
//   /api/descadastro?email=<email>
// Registra o e-mail na tabela email_descadastros e devolve uma página
// HTML simples de confirmação (para o destinatário ver no navegador).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function pagina(titulo: string, mensagem: string, cor: string): string {
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px 32px;max-width:440px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.06)}
  .ico{width:56px;height:56px;border-radius:50%;background:${cor}1a;color:${cor};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;font-weight:700}
  h1{font-size:18px;color:#0f172a;margin:0 0 8px}
  p{font-size:14px;color:#475569;line-height:1.5;margin:0}
</style></head>
<body><div class="card"><div class="ico">✓</div><h1>${titulo}</h1><p>${mensagem}</p></div></body></html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = String((req.query?.email as string) || '').trim().toLowerCase()
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).send(pagina('Link inválido', 'Não foi possível identificar o e-mail para descadastro.', '#dc2626'))
    return
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).send(pagina('Erro', 'Serviço indisponível no momento. Tente novamente mais tarde.', '#dc2626'))
      return
    }
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase
      .from('email_descadastros')
      .upsert({ email, motivo: 'Descadastro via link' }, { onConflict: 'email' })

    if (error) {
      res.status(500).send(pagina('Erro ao processar', 'Não foi possível concluir o descadastro agora. Tente novamente mais tarde.', '#dc2626'))
      return
    }

    res.status(200).send(pagina(
      'Descadastro confirmado',
      `O e-mail <strong>${email}</strong> não receberá mais nossas comunicações. Você pode fechar esta página.`,
      '#16a34a'
    ))
  } catch {
    res.status(500).send(pagina('Erro', 'Ocorreu um erro inesperado. Tente novamente mais tarde.', '#dc2626'))
  }
}
