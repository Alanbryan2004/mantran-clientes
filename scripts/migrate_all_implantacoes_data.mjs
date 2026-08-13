import { createClient } from '@supabase/supabase-js'
import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const sqlConfig = {
  user: 'ALAN1',
  password: '@@mnt',
  database: 'dbSuporte',
  server: '56.126.50.39',
  port: 39533,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: true }
}

async function migrateImplantacoesSubtables() {
  try {
    console.log("Connecting to SQL Server...")
    await sql.connect(sqlConfig)

    // 1. Etapas
    console.log("\nFetching implantacao_etapas from Supabase...")
    const { data: etapas, error: etapasErr } = await supabase.from('implantacao_etapas').select('*')
    if (etapasErr) console.error("Etapas err:", etapasErr)
    
    if (etapas && etapas.length > 0) {
      console.log(`Inserting ${etapas.length} etapas into SQL Server...`)
      let insertedEtapas = 0
      for (const row of etapas) {
        const request = new sql.Request()
        request.input('id', row.id)
        request.input('implantacao_id', row.implantacao_id)
        request.input('nome_etapa', row.nome_etapa)
        request.input('valor', row.valor || 'EM BRANCO')
        request.input('ordem', row.ordem || 0)

        try {
          await request.query(`
            IF NOT EXISTS (SELECT * FROM implantacao_etapas WHERE id = @id)
            BEGIN
              INSERT INTO implantacao_etapas (id, implantacao_id, nome_etapa, valor, ordem)
              VALUES (@id, @implantacao_id, @nome_etapa, @valor, @ordem)
            END
          `)
          insertedEtapas++
        } catch (err) {
          // Ignore FK conflicts if implantacao_id is not in SQL Server
        }
      }
      console.log(`✅ Processed ${insertedEtapas} etapas in SQL Server.`)
    }

    // 2. Historico
    console.log("\nFetching implantacao_historico from Supabase...")
    const { data: hist, error: histErr } = await supabase.from('implantacao_historico').select('*')
    if (histErr) console.error("Hist err:", histErr)
    
    if (hist && hist.length > 0) {
      console.log(`Inserting ${hist.length} historico entries into SQL Server...`)
      let insertedHist = 0
      for (const row of hist) {
        const request = new sql.Request()
        request.input('id', row.id)
        request.input('implantacao_id', row.implantacao_id)
        request.input('texto', row.texto)
        request.input('data_hora', row.data_hora ? new Date(row.data_hora) : new Date())

        try {
          await request.query(`
            IF NOT EXISTS (SELECT * FROM implantacao_historico WHERE id = @id)
            BEGIN
              INSERT INTO implantacao_historico (id, implantacao_id, texto, data_hora)
              VALUES (@id, @implantacao_id, @texto, @data_hora)
            END
          `)
          insertedHist++
        } catch (err) {
          // Ignore FK conflicts if implantacao_id is not in SQL Server
        }
      }
      console.log(`✅ Processed ${insertedHist} historico entries in SQL Server.`)
    }

    const impCount = await sql.query(`SELECT COUNT(*) as count FROM implantacoes`)
    const etapasCount = await sql.query(`SELECT COUNT(*) as count FROM implantacao_etapas`)
    const histCount = await sql.query(`SELECT COUNT(*) as count FROM implantacao_historico`)

    console.log(`\n🎉 FINAL SQL SERVER STATS:`)
    console.log(`- implantacoes: ${impCount.recordset[0].count} registros`)
    console.log(`- implantacao_etapas: ${etapasCount.recordset[0].count} registros`)
    console.log(`- implantacao_historico: ${histCount.recordset[0].count} registros`)

  } catch (err) {
    console.error("General error:", err)
  } finally {
    process.exit(0)
  }
}

migrateImplantacoesSubtables()
