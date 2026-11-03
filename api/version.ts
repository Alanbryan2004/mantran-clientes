import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_VERSION = {
  "version": "2026.11.3-143801",
  "buildTime": "2026-11-03T17:38:01.676Z"
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
