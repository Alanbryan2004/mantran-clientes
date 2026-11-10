import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
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
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  res.setHeader('Access-Control-Allow-Origin', '*')

  return res.status(200).json(APP_VERSION)
}
`
      fs.writeFileSync(apiVersionPath, apiVersionContent, 'utf-8')
      console.log(`\n🔄 [AutoVersion] version.json e api/version.ts atualizados → v${buildVersion}\n`)
    }
  }
}

// Só em `npm run dev`: o Vite não executa a pasta api/ (funções da Vercel). Este plugin serve localmente
// a rota de acesso/cadastro de clientes, rodando o MESMO código que vai para produção.
// ATENÇÃO: usa o banco e o SMTP reais configurados (grava no Supabase e envia e-mails de verdade).
// Não existe no build/produção (apply: 'serve').
function apiLocalDevPlugin(env: Record<string, string>): Plugin {
  const ROTAS = ['acesso-contato']
  return {
    name: 'api-local-dev',
    apply: 'serve',
    configureServer(server) {
      // Variáveis do .env / .env.local ficam disponíveis para a função, como na Vercel
      for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CADASTRO_SECRET']) {
        if (!process.env[k] && env[k]) process.env[k] = env[k]
      }
      // Sem segredo configurado, usa um aleatório desta execução (links de e-mails de execuções antigas deixam de valer)
      if (!process.env.CADASTRO_SECRET && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.CADASTRO_SECRET = randomBytes(32).toString('hex')
      }

      for (const rota of ROTAS) {
        server.middlewares.use(`/api/${rota}`, async (req, res) => {
          // Corpo JSON (limite de 200 KB)
          let bruto = ''
          let estourou = false
          await new Promise<void>(resolve => {
            req.on('data', (c: Buffer) => {
              bruto += c.toString('utf8')
              if (bruto.length > 200_000) { estourou = true; req.destroy(); resolve() }
            })
            req.on('end', () => resolve())
            req.on('error', () => resolve())
          })
          const responder = (status: number, obj: unknown) => {
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(obj))
          }
          if (estourou) { responder(413, { ok: false, erro: 'Requisição grande demais.' }); return }

          let body: unknown = {}
          try { body = bruto ? JSON.parse(bruto) : {} } catch { body = {} }

          // Os links dos e-mails apontam para este servidor local
          process.env.SITE_URL = `http://${req.headers.host}`

          // Imitação mínima de VercelRequest/VercelResponse
          const resp = {
            setHeader: (k: string, v: string) => { res.setHeader(k, v); return resp },
            status: (code: number) => { res.statusCode = code; return resp },
            json: (obj: unknown) => { responder(res.statusCode || 200, obj); return resp }
          }
          try {
            const mod = await server.ssrLoadModule(`/api/${rota}.ts`)
            await (mod.default as (rq: unknown, rs: unknown) => Promise<void>)(
              { method: req.method, body, headers: req.headers, query: {} },
              resp
            )
          } catch (e) {
            console.error(`[api-local-dev] erro em /api/${rota}:`, e)
            if (!res.writableEnded) responder(500, { ok: false, erro: 'Erro interno no servidor local.' })
          }
        })
      }
      server.config.logger.info(`  [api-local-dev] /api/${ROTAS.join(', /api/')} ativo localmente (usa o banco e o SMTP reais).`)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build'
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(isBuild ? buildVersion : 'dev')
    },
    plugins: [react(), tailwindcss(), autoVersionPlugin(), apiLocalDevPlugin(env)],
  }
})

