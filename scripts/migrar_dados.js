import { createClient } from '@supabase/supabase-js'
import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// 1. Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam variáveis do Supabase no .env!")
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

// 2. Configurar SQL Server (String de Conexão fornecida pelo DAB)
const sqlConfig = {
  user: 'ALAN1',
  password: '@@mnt',
  database: 'dbSuporte',
  server: '56.126.50.39',
  port: 39533,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
}

async function startMigration() {
  try {
    console.log("Conectando ao SQL Server...")
    await sql.connect(sqlConfig)
    console.log("✅ Conectado ao SQL Server!")

    // Garantir criação das tabelas novas no SQL Server se não existirem
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacoes')
      BEGIN
          CREATE TABLE implantacoes (
              id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
              cliente_id UNIQUEIDENTIFIER NULL,
              nome_cliente NVARCHAR(255) NOT NULL,
              base_nome NVARCHAR(100) NULL,
              tipo_cliente NVARCHAR(50) DEFAULT 'NORMAL',
              status NVARCHAR(50) DEFAULT 'Em Andamento',
              data_inicio DATETIME DEFAULT GETDATE(),
              data_previsao DATETIME NULL,
              created_at DATETIME DEFAULT GETDATE()
          );
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_etapas')
      BEGIN
          CREATE TABLE implantacao_etapas (
              id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
              implantacao_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES implantacoes(id) ON DELETE CASCADE,
              nome_etapa NVARCHAR(255) NOT NULL,
              valor NVARCHAR(50) DEFAULT 'EM BRANCO',
              ordem INT DEFAULT 0,
              created_at DATETIME DEFAULT GETDATE()
          );
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'implantacao_historico')
      BEGIN
          CREATE TABLE implantacao_historico (
              id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
              implantacao_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES implantacoes(id) ON DELETE CASCADE,
              data_hora DATETIME DEFAULT GETDATE(),
              texto NVARCHAR(MAX) NOT NULL,
              created_at DATETIME DEFAULT GETDATE()
          );
      END

      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'leo_empresas')
      BEGIN
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('leo_empresas') AND name = 'ativo')
          BEGIN
              ALTER TABLE leo_empresas ADD ativo BIT DEFAULT 1;
          END
      END
    `)
    console.log("✅ Estrutura de tabelas verificada/criada no SQL Server!")

    // Ordem das tabelas respeitando as dependências (Foreign Keys)
    const tables = [
      'usuario',
      'clientes',
      'bases',
      'usuarios_gpo',
      'modulos',
      'modulos_mantran',
      'implantacoes',
      'implantacao_etapas',
      'implantacao_historico',
      'projetos',
      'projeto_colunas',
      'projeto_bases',
      'projeto_dados',
      'leo_empresas',
      'leo_usuarios',
      'leo_modulos'
    ]

    for (const tableName of tables) {
      console.log(`\n⬇️ Baixando dados da tabela: ${tableName}...`)
      
      const { data, error } = await supabase.from(tableName).select('*')
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.log(`⚠️ Tabela ${tableName} não encontrada no Supabase. Pulando...`)
            continue
        } else {
            console.error(`Erro ao buscar ${tableName} no Supabase:`, error)
            continue
        }
      }

      if (!data || data.length === 0) {
        console.log(`ℹ️ Tabela ${tableName} está vazia no Supabase.`)
        continue
      }

      // Obter colunas válidas no SQL Server para esta tabela
      const schemaResult = await sql.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
      const validColumns = schemaResult.recordset.map(r => r.COLUMN_NAME.toLowerCase());

      console.log(`⬆️ Inserindo ${data.length} registros na tabela: ${tableName} do SQL Server...`)
      
      // Inserir registro por registro
      for (const row of data) {
        const rowFiltered = {};
        for (const key of Object.keys(row)) {
            if (validColumns.includes(key.toLowerCase())) {
                rowFiltered[key] = row[key];
            }
        }
        
        const columns = Object.keys(rowFiltered)
        const values = Object.values(rowFiltered)

        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${columns.map((_, i) => `@param${i}`).join(', ')})
        `

        const request = new sql.Request()
        
        values.forEach((value, index) => {
            const colName = columns[index].toLowerCase()
            const isDateCol = colName.endsWith('_at') || colName.endsWith('_em') || colName.startsWith('data_')
            
            // Conversão de booleanos, arrays e datas para o SQL Server
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
        } catch (insertError) {
            // Se der erro de primary key repetida, ignoramos
            if (insertError.message.includes("Violation of PRIMARY KEY constraint") || insertError.message.includes("Violation of UNIQUE KEY constraint")) {
                // Ignore silentlly
            } else {
                console.error(`❌ Erro ao inserir linha na tabela ${tableName}:`, insertError.message)
            }
        }
      }
      console.log(`✅ Tabela ${tableName} finalizada!`)
    }

    console.log("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
    process.exit(0)

  } catch (err) {
    console.error("❌ Falha geral na migração:", err)
    process.exit(1)
  }
}

startMigration()
