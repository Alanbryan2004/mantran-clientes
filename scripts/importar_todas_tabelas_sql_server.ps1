$ErrorActionPreference = "Continue"

$jsonDir = "c:\Users\Admin\mantranweb\MantranClientes\scratch\supabase_export"
if (-not (Test-Path $jsonDir)) {
    Write-Error "Diretório de exportação não encontrado: $jsonDir"
    exit 1
}

$connStr = "Server=56.126.50.39,39533;Database=dbSuporte;User Id=ALAN1;Password=@@mnt;Encrypt=True;TrustServerCertificate=True;Connect Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
Write-Host ">>> Conectado ao SQL Server dbSuporte com sucesso! <<<`n"

# 1. Desativar todas as constraints e triggers
Write-Host "Desativando constraints e triggers no dbSuporte..."
$cmdDisable = $conn.CreateCommand()
$cmdDisable.CommandText = @"
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";
EXEC sp_MSforeachtable "ALTER TABLE ? DISABLE TRIGGER all";
"@
$cmdDisable.ExecuteNonQuery() | Out-Null
Write-Host "Constraints e triggers desativados.`n"

# Mapeamento: Arquivo JSON -> Tabela no SQL Server
# Ordem respeitando pais antes de filhos
$tabelasSync = @(
    @{ File = "perfil_permissoes.json";       Table = "perfil_permissoes" },
    @{ File = "usuario.json";                 Table = "Usuario" },
    @{ File = "clientes.json";                Table = "Clientes" },
    @{ File = "bases.json";                   Table = "Bases" },
    @{ File = "clientes_desativados.json";     Table = "clientes_desativados" },
    @{ File = "empresa_vinculos.json";         Table = "empresa_vinculos" },
    @{ File = "modulos.json";                 Table = "Modulos" },
    @{ File = "modulos_mantran.json";         Table = "Modulos_Mantran" },
    @{ File = "usuarios_gpo.json";            Table = "Usuarios_GPO" },
    @{ File = "config_email.json";            Table = "config_email" },
    @{ File = "leo_empresas.json";            Table = "Leo_Empresas" },
    @{ File = "leo_usuarios.json";            Table = "Leo_Usuarios" },
    @{ File = "leo_modulos.json";             Table = "Leo_Modulos" },
    @{ File = "implantacoes.json";            Table = "implantacoes" },
    @{ File = "implantacao_etapas.json";      Table = "implantacao_etapas" },
    @{ File = "implantacao_checkpoint.json";  Table = "implantacao_checkpoint" },
    @{ File = "implantacao_historico.json";   Table = "implantacao_historico" },
    @{ File = "projetos.json";                Table = "Projetos" },
    @{ File = "projeto_bases.json";           Table = "Projeto_Bases" },
    @{ File = "projeto_colunas.json";         Table = "Projeto_Colunas" },
    @{ File = "projeto_dados.json";           Table = "Projeto_Dados" },
    @{ File = "notificacoes.json";            Table = "notificacoes" },
    @{ File = "notificacao_status.json";      Table = "notificacao_status" },
    @{ File = "email_campanhas.json";         Table = "email_campanhas" },
    @{ File = "email_envios.json";            Table = "email_envios" },
    @{ File = "email_descadastros.json";      Table = "email_descadastros" },
    @{ File = "faq_categorias.json";          Table = "faq_categorias" },
    @{ File = "faq_procedimentos.json";       Table = "faq_procedimentos" },
    @{ File = "faq_passos.json";              Table = "faq_passos" },
    @{ File = "calendario_eventos.json";      Table = "calendario_eventos" },
    @{ File = "calendario_convidados.json";   Table = "calendario_convidados" },
    @{ File = "calendario_lembretes.json";    Table = "calendario_lembretes" },
    @{ File = "comercial_metas.json";         Table = "comercial_metas" },
    @{ File = "comercial_oportunidades.json"; Table = "comercial_oportunidades" },
    @{ File = "rh_jornada.json";              Table = "rh_jornada" },
    @{ File = "rh_ponto.json";                Table = "rh_ponto" },
    @{ File = "rh_faltas_atestados.json";     Table = "rh_faltas_atestados" },
    @{ File = "rh_ferias.json";               Table = "rh_ferias" },
    @{ File = "rh_home_office.json";          Table = "rh_home_office" },
    @{ File = "rh_plantoes.json";             Table = "rh_plantoes" },
    @{ File = "rh_dayoff.json";               Table = "rh_dayoff" },
    @{ File = "ticket_departamentos.json";    Table = "ticket_departamentos" },
    @{ File = "ticket_tipos.json";            Table = "ticket_tipos" },
    @{ File = "ticket_classificacoes.json";   Table = "ticket_classificacoes" },
    @{ File = "ticket_grupos.json";           Table = "ticket_grupos" },
    @{ File = "ticket_contatos.json";         Table = "ticket_contatos" },
    @{ File = "tickets.json";                 Table = "tickets" },
    @{ File = "ticket_mensagens.json";        Table = "ticket_mensagens" },
    @{ File = "ticket_anexos.json";           Table = "ticket_anexos" },
    @{ File = "ticket_historico.json";        Table = "ticket_historico" },
    @{ File = "shopee_transportadoras.json";  Table = "shopee_transportadoras" },
    @{ File = "shopee_processamentos.json";   Table = "shopee_processamentos" }
)

$resultadoSync = [System.Collections.Generic.List[object]]::new()

foreach ($item in $tabelasSync) {
    $filePath = Join-Path $jsonDir $item.File
    $tableName = $item.Table

    if (-not (Test-Path $filePath)) {
        continue
    }

    $rawJson = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    if ($rawJson.Length -gt 0 -and $rawJson[0] -eq [char]0xFEFF) {
        $rawJson = $rawJson.Substring(1)
    }

    $rows = $rawJson | ConvertFrom-Json
    if ($null -eq $rows) {
        $rows = @()
    }
    if ($rows -isnot [System.Array]) {
        $rows = @($rows)
    }

    # Obter colunas reais da tabela no SQL Server
    $cmdCols = $conn.CreateCommand()
    $cmdCols.CommandText = "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$tableName'"
    $rCols = $cmdCols.ExecuteReader()
    $colTypes = @{}
    while ($rCols.Read()) {
        $colTypes[$rCols['COLUMN_NAME'].ToString().ToLower()] = @{
            OriginalName = $rCols['COLUMN_NAME'].ToString()
            DataType = $rCols['DATA_TYPE'].ToString().ToLower()
            IsNullable = $rCols['IS_NULLABLE'].ToString().ToUpper()
        }
    }
    $rCols.Close()

    if ($colTypes.Count -eq 0) {
        Write-Warning "Tabela $tableName não encontrada no SQL Server!"
        continue
    }

    # Limpar tabela no SQL Server antes de inserir
    $cmdTruncate = $conn.CreateCommand()
    $cmdTruncate.CommandText = "DELETE FROM [$tableName]"
    $cmdTruncate.ExecuteNonQuery() | Out-Null

    if ($rows.Count -eq 0) {
        Write-Host ("[OK] {0,-28} -> 0 registros (tabela limpa)" -f $tableName)
        $resultadoSync.Add([pscustomobject]@{ Tabela = $tableName; Inseridos = 0; Status = "OK" })
        continue
    }

    # Construir DataTable com as colunas correspondentes
    $dt = New-Object System.Data.DataTable($tableName)
    $activeCols = @{}

    # Identificar quais colunas do primeiro registro batem com o SQL Server
    $sampleRow = $rows[0]
    foreach ($prop in $sampleRow.PSObject.Properties) {
        $propLower = $prop.Name.ToLower()
        if ($colTypes.ContainsKey($propLower)) {
            $colMeta = $colTypes[$propLower]
            $origName = $colMeta.OriginalName
            $dType = $colMeta.DataType

            # Definir tipo no .NET DataTable
            $netType = [System.String]
            if ($dType -in @("int", "smallint", "tinyint")) { $netType = [System.Int32] }
            elseif ($dType -eq "bigint") { $netType = [System.Int64] }
            elseif ($dType -in @("decimal", "numeric", "money")) { $netType = [System.Decimal] }
            elseif ($dType -in @("float", "real")) { $netType = [System.Double] }
            elseif ($dType -eq "bit") { $netType = [System.Boolean] }
            elseif ($dType -in @("datetime", "datetime2", "smalldatetime", "date")) { $netType = [System.DateTime] }
            elseif ($dType -eq "uniqueidentifier") { $netType = [System.Guid] }

            $dt.Columns.Add($origName, $netType) | Out-Null
            $activeCols[$prop.Name] = @{
                TargetName = $origName
                DataType = $dType
                IsNullable = $colMeta.IsNullable
            }
        }
    }

    # Preencher DataTable
    foreach ($r in $rows) {
        $dr = $dt.NewRow()
        foreach ($propName in $activeCols.Keys) {
            $colInfo = $activeCols[$propName]
            $targetCol = $colInfo.TargetName
            $targetType = $colInfo.DataType
            $isNotNull = ($colInfo.IsNullable -eq "NO")
            $val = $r.$propName

            if ($null -eq $val -or $val -eq "") {
                if ($isNotNull) {
                    if ($targetType -eq "bit") {
                        $dr[$targetCol] = $false
                    } elseif ($targetType -in @("int", "smallint", "tinyint")) {
                        $dr[$targetCol] = 0
                    } elseif ($targetType -eq "bigint") {
                        $dr[$targetCol] = 0L
                    } elseif ($targetType -in @("decimal", "numeric", "money", "float", "real")) {
                        $dr[$targetCol] = 0.0
                    } elseif ($targetType -in @("datetime", "datetime2", "smalldatetime", "date")) {
                        $dr[$targetCol] = [System.DateTime]::Parse("2000-01-01")
                    } elseif ($targetType -eq "uniqueidentifier") {
                        $dr[$targetCol] = [System.Guid]::NewGuid()
                    } else {
                        $dr[$targetCol] = ""
                    }
                } else {
                    $dr[$targetCol] = [DBNull]::Value
                }
            } else {
                try {
                    if ($targetType -eq "uniqueidentifier") {
                        $dr[$targetCol] = [System.Guid]::Parse($val.ToString())
                    } elseif ($targetType -eq "bit") {
                        $dr[$targetCol] = [bool]$val
                    } elseif ($targetType -in @("datetime", "datetime2", "smalldatetime", "date")) {
                        $dr[$targetCol] = [System.DateTime]::Parse($val.ToString())
                    } elseif ($targetType -in @("int", "smallint", "tinyint")) {
                        $dr[$targetCol] = [int]$val
                    } elseif ($targetType -eq "bigint") {
                        $dr[$targetCol] = [long]$val
                    } elseif ($targetType -in @("decimal", "numeric", "money")) {
                        $dr[$targetCol] = [decimal]$val
                    } elseif ($targetType -in @("float", "real")) {
                        $dr[$targetCol] = [double]$val
                    } else {
                        if ($val -is [System.Management.Automation.PSCustomObject] -or $val -is [System.Array]) {
                            $dr[$targetCol] = ($val | ConvertTo-Json -Compress)
                        } else {
                            $dr[$targetCol] = $val.ToString()
                        }
                    }
                } catch {
                    if ($isNotNull) {
                        if ($targetType -eq "bit") { $dr[$targetCol] = $false }
                        elseif ($targetType -in @("int", "smallint", "tinyint", "bigint")) { $dr[$targetCol] = 0 }
                        elseif ($targetType -eq "uniqueidentifier") { $dr[$targetCol] = [System.Guid]::NewGuid() }
                        elseif ($targetType -in @("datetime", "datetime2", "date")) { $dr[$targetCol] = [System.DateTime]::Parse("2000-01-01") }
                        else { $dr[$targetCol] = "" }
                    } else {
                        $dr[$targetCol] = [DBNull]::Value
                    }
                }
            }
        }
        $dt.Rows.Add($dr)
    }

    # Inserir usando SqlBulkCopy
    $options = [System.Data.SqlClient.SqlBulkCopyOptions]([int][System.Data.SqlClient.SqlBulkCopyOptions]::KeepIdentity -bor [int][System.Data.SqlClient.SqlBulkCopyOptions]::TableLock)
    $bulk = New-Object System.Data.SqlClient.SqlBulkCopy($conn, $options, $null)
    $bulk.DestinationTableName = "[$tableName]"
    $bulk.BulkCopyTimeout = 120
    foreach ($col in $dt.Columns) {
        $bulk.ColumnMappings.Add($col.ColumnName, $col.ColumnName) | Out-Null
    }

    try {
        $bulk.WriteToServer($dt)
        Write-Host ("[OK] {0,-28} -> {1,5} registros inseridos." -f $tableName, $dt.Rows.Count)
        $resultadoSync.Add([pscustomobject]@{ Tabela = $tableName; Inseridos = $dt.Rows.Count; Status = "OK" })
    } catch {
        Write-Warning ("Erro ao inserir em " + $tableName + ": " + $_.Exception.Message)
        $resultadoSync.Add([pscustomobject]@{ Tabela = $tableName; Inseridos = 0; Status = ("ERRO: " + $_.Exception.Message) })
    } finally {
        $bulk.Close()
    }
}

# 3. Reativar constraints e triggers
Write-Host "`nReativando constraints e triggers no dbSuporte..."
$cmdEnable = $conn.CreateCommand()
$cmdEnable.CommandText = "EXEC sp_MSforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT all';"
try {
    $cmdEnable.ExecuteNonQuery() | Out-Null
    Write-Host "Constraints e triggers reativados com sucesso.`n"
} catch {
    Write-Warning ("Aviso ao checar constraints: " + $_.Exception.Message)
}

$conn.Close()

Write-Host "========================================================="
Write-Host "         RELATORIO DE SINCRONIZACAO DBSUPORTE            "
Write-Host "========================================================="
$resultadoSync | Format-Table -AutoSize | Out-String | Write-Host
