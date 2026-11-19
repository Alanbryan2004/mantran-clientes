import type { VercelRequest, VercelResponse } from '@vercel/node'

export const maxDuration = 30

function extrairHeaderEPayload(str: string): { headerObj: any; payloadObj: any } | null {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{')) return null

  let depth = 0
  let inString = false
  let escape = false
  let headerEnd = -1

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        headerEnd = i
        break
      }
    }
  }

  if (headerEnd === -1) return null
  const resto = trimmed.slice(headerEnd + 1).trim()
  if (!resto.startsWith('.')) return null

  const aposPonto = resto.slice(1).trim()
  if (!aposPonto.startsWith('{')) return null

  depth = 0
  inString = false
  escape = false
  let payloadEnd = -1

  for (let j = 0; j < aposPonto.length; j++) {
    const ch = aposPonto[j]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        payloadEnd = j
        break
      }
    }
  }

  if (payloadEnd === -1) return null

  try {
    const headerObj = JSON.parse(trimmed.slice(0, headerEnd + 1))
    const payloadObj = JSON.parse(aposPonto.slice(0, payloadEnd + 1))
    return { headerObj, payloadObj }
  } catch {
    return null
  }
}

function toBase64Url(obj: any): string {
  const jsonStr = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return Buffer.from(jsonStr, 'utf-8').toString('base64url')
}

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
      bodyStr = payload.trim()
      // Se vier no formato {header}.{payload} (ex.: {"account":"..."}.{"data":...})
      const extraido = extrairHeaderEPayload(bodyStr)
      if (extraido) {
        const jwt = `${toBase64Url(extraido.headerObj)}.${toBase64Url(extraido.payloadObj)}.sig`
        bodyStr = JSON.stringify({ jwt })
      }
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

