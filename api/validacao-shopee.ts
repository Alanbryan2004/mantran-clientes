import type { VercelRequest, VercelResponse } from '@vercel/node'

export const maxDuration = 30

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido. Utilize POST.' })
    return
  }

  try {
    const { apiUrl, payload } = req.body || {}
    const baseUrl = (apiUrl || 'http://18.231.33.156:35397').trim().replace(/\/+$/, '')
    const targetUrl = `${baseUrl}/ValidacaoJsonShopee`

    let bodyStr: string
    if (typeof payload === 'string') {
      bodyStr = payload
    } else if (payload && typeof payload === 'object') {
      bodyStr = JSON.stringify(payload)
    } else {
      bodyStr = '{}'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyStr,
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    if (response.status === 404) {
      return res.status(404).json({
        erro: 'A API respondeu 404: o endpoint /ValidacaoJsonShopee ainda não foi publicado nesta API.'
      })
    }

    if (response.status === 413) {
      return res.status(413).json({
        erro: 'O arquivo ou texto enviado é grande demais (limite de 2 MB).'
      })
    }

    const data = await response.json().catch(() => null)
    if (!response.ok || !data) {
      const msg = (data && (data.message || data.title || data.erro)) || `Falha na consulta (HTTP ${response.status}).`
      return res.status(response.status).json({ erro: msg })
    }

    return res.status(200).json(data)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ erro: 'Tempo limite esgotado ao consultar a API da Shopee (25s).' })
    }
    return res.status(500).json({
      erro: `Não foi possível comunicar com a API: ${err.message || 'Erro de conexão'}`
    })
  }
}

