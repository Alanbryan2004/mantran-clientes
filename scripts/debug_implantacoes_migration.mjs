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

async function debugImplantacoes() {
  try {
    console.log("Fetching implantacoes from Supabase...")
    const { data, error } = await supabase.from('implantacoes').select('*')
    if (error) {
      console.error("Supabase error:", error)
      return
    }
    console.log(`Found ${data ? data.length : 0} rows in Supabase implantacoes.`)

    console.log("Connecting to SQL Server...")
    await sql.connect(sqlConfig)

    // Make nome_cliente nullable if present, and add missing columns
    console.log("Fixing implantacoes table schema in SQL Server...")
    await sql.query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'nome_cliente')
          ALTER TABLE implantacoes ALTER COLUMN nome_cliente NVARCHAR(255) NULL;
          
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'base_id')
          ALTER TABLE implantacoes ADD base_id UNIQUEIDENTIFIER NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'nome_empresa')
          ALTER TABLE implantacoes ADD nome_empresa NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'operacoes_shopee')
          ALTER TABLE implantacoes ADD operacoes_shopee NVARCHAR(MAX) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'modulos_normal')
          ALTER TABLE implantacoes ADD modulos_normal NVARCHAR(MAX) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('implantacoes') AND name = 'updated_at')
          ALTER TABLE implantacoes ADD updated_at DATETIME NULL;
    `)

    // Get valid SQL Server columns
    const schemaResult = await sql.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'implantacoes'`)
    const validColumns = schemaResult.recordset.map(r => r.COLUMN_NAME.toLowerCase())

    for (const row of data) {
      const rowFiltered = {}
      for (const key of Object.keys(row)) {
        if (validColumns.includes(key.toLowerCase())) {
          rowFiltered[key] = row[key]
        }
      }

      const request = new sql.Request()
      const columns = Object.keys(rowFiltered)
      const values = Object.values(rowFiltered)

      const insertQuery = `
        INSERT INTO implantacoes (${columns.join(', ')})
        VALUES (${columns.map((_, i) => `@param${i}`).join(', ')})
      `

      values.forEach((value, index) => {
        const colName = columns[index].toLowerCase()
        const isDateCol = colName.endsWith('_at') || colName.endsWith('_em') || colName.startsWith('data_')
        
        if (typeof value === 'boolean') {
          request.input(`param${index}`, sql.Bit, value ? 1 : 0)
        } else if (Array.isArray(value)) {
          request.input(`param${index}`, JSON.stringify(value))
        } else if (isDateCol && value) {
          request.input(`param${index}`, sql.DateTime, new Date(value))
        } else {
          request.input(`param${index}`, value)
        }
      })

      try {
        await request.query(insertQuery)
        console.log(`✅ Inserted row '${row.nome_empresa}' (${row.id}) into SQL Server implantacoes!`)
      } catch (err) {
        if (err.message.includes("PRIMARY KEY") || err.message.includes("UNIQUE")) {
          console.log(`ℹ️ Row '${row.nome_empresa}' already exists in SQL Server.`)
        } else {
          console.error(`❌ Error inserting row ID ${row.id}:`, err.message)
        }
      }
    }

    const countResult = await sql.query(`SELECT COUNT(*) as count FROM implantacoes`)
    console.log(`\n🎉 Total rows in SQL Server implantacoes table: ${countResult.recordset[0].count}`)

  } catch (err) {
    console.error("General error:", err)
  } finally {
    process.exit(0)
  }
}

debugImplantacoes()
