import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_VERSION = {
  "version": "2026.11.2-095607",
  "buildTime": "2026-11-02T12:56:07.388Z"
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
