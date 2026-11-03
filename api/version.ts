import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_VERSION = {
  "version": "2026.11.3-155337",
  "buildTime": "2026-11-03T18:53:37.010Z"
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
