import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import sql from 'mssql'

export const maxDuration = 60

const SQL_CONFIG = {
  user: process.env.SQL_SERVER_USER || 'ALAN1',
  password: process.env.SQL_SERVER_PASSWORD || '@@mnt',
  server: process.env.SQL_SERVER_HOST || '56.126.50.39',
  port: Number(process.env.SQL_SERVER_PORT) || 39533,
  database: process.env.SQL_SERVER_DATABASE || 'dbSuporte',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 25000,
    requestTimeout: 45000
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido. Use POST.' })
    return
  }

  let pool: sql.ConnectionPool | null = null

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dnrlcidwgkwfsivlqtba.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZCYndadkUgmhVx7FdDxdJA_KeooUPsk'

    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ ok: false, erro: 'Configurações de Supabase não encontradas.' })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Conectar ao SQL Server dbSuporte
    pool = await sql.connect(SQL_CONFIG)

    const result = await pool.request().query(`
      SELECT 
        id, 
        transportadora_id, 
        nome_empresa, 
        nome_base, 
        cnpj, 
        quinzena, 
        mes, 
        ano, 
        processo, 
        status, 
        segundos_processamento, 
        registros_processados, 
        data_inicio, 
        data_fim, 
        created_at, 
        updated_at 
      FROM shopee_processamentos
    `)

    const registrosSql = result.recordset || []
    if (registrosSql.length === 0) {
      res.status(200).json({
        ok: true,
        total: 0,
        mensagem: 'Nenhum registro encontrado no SQL Server para sincronizar.'
      })
      return
    }

    // 2. Buscar IDs de transportadoras válidas no Supabase (para integridade de FK)
    const { data: transpsExistentes } = await supabase
      .from('shopee_transportadoras')
      .select('id')
    const setTransp = new Set((transpsExistentes || []).map(t => t.id))

    // 3. Contagem antes no Supabase
    const { count: countAntes } = await supabase
      .from('shopee_processamentos')
      .select('*', { count: 'exact', head: true })

    // 4. Executar UPSERT em lotes
    const BATCH_SIZE = 50
    let totalProcessado = 0

    for (let i = 0; i < registrosSql.length; i += BATCH_SIZE) {
      const batch = registrosSql.slice(i, i + BATCH_SIZE).map((p: any) => ({
        id: String(p.id),
        transportadora_id: (p.transportadora_id && setTransp.has(String(p.transportadora_id))) ? String(p.transportadora_id) : null,
        nome_empresa: p.nome_empresa || '',
        nome_base: p.nome_base || null,
        cnpj: p.cnpj || null,
        quinzena: Number(p.quinzena) || 1,
        mes: Number(p.mes) || 1,
        ano: Number(p.ano) || 2026,
        processo: p.processo || 'Last Mile',
        status: p.status || 'NAO_INICIADO',
        segundos_processamento: Number(p.segundos_processamento) || 0,
        registros_processados: Number(p.registros_processados) || 0,
        data_inicio: p.data_inicio ? new Date(p.data_inicio).toISOString() : null,
        data_fim: p.data_fim ? new Date(p.data_fim).toISOString() : null,
        created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
        updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()
      }))

      const { error: upsertError } = await supabase
        .from('shopee_processamentos')
        .upsert(batch, { onConflict: 'id' })

      if (upsertError) {
        throw new Error(`Erro ao sincronizar lote (${i}-${i + batch.length}): ${upsertError.message}`)
      }

      totalProcessado += batch.length
    }

    // 5. Contagem depois no Supabase
    const { count: countDepois } = await supabase
      .from('shopee_processamentos')
      .select('*', { count: 'exact', head: true })

    res.status(200).json({
      ok: true,
      total: totalProcessado,
      registrosAntes: countAntes ?? 0,
      registrosDepois: countDepois ?? 0,
      mensagem: `${totalProcessado} registros de Shopee Processamentos sincronizados com sucesso do SQL Server para o Supabase!`
    })
  } catch (error: any) {
    console.error('Erro na sincronização de shopee_processamentos:', error)
    res.status(500).json({
      ok: false,
      erro: error.message || 'Erro interno ao sincronizar com SQL Server.'
    })
  } finally {
    if (pool) {
      try {
        await pool.close()
      } catch (_) {}
    }
  }
}
