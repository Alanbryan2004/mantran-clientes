import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_VERSION = {
  "version": "2026.11.4-111229",
  "buildTime": "2026-11-04T14:12:29.450Z"
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
