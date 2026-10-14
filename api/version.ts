import type { VercelRequest, VercelResponse } from '@vercel/node'
import { APP_VERSION } from '../src/version'

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Impede qualquer tipo de cache na CDN/Edge da Vercel e no navegador
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
