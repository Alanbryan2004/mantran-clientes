import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const now = new Date()
const buildVersion = [
  now.getFullYear(),
  now.getMonth() + 1,
  now.getDate()
].join('.') + '-' + [
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0')
].join('')

function autoVersionPlugin(): Plugin {
  return {
    name: 'auto-version',
    apply: 'build',
    buildStart() {
      const versionPath = path.resolve(__dirname, 'public/version.json')
      const apiVersionPath = path.resolve(__dirname, 'api/version.ts')
      const content = JSON.stringify({
        version: buildVersion,
        buildTime: now.toISOString()
      }, null, 2) + '\n'

      fs.writeFileSync(versionPath, content, 'utf-8')

      const apiVersionContent = `import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_VERSION = ${content.trim()}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
`
      fs.writeFileSync(apiVersionPath, apiVersionContent, 'utf-8')
      console.log(`\n🔄 [AutoVersion] version.json e api/version.ts atualizados → v${buildVersion}\n`)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  return {
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(isBuild ? buildVersion : 'dev')
    },
    plugins: [react(), tailwindcss(), autoVersionPlugin()],
  }
})

