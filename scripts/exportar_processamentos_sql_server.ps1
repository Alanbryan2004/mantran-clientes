$ErrorActionPreference = "Stop"

$scratchDir = "c:\Users\Admin\mantranweb\MantranClientes\scratch"
if (-not (Test-Path $scratchDir)) {
    New-Item -ItemType Directory -Path $scratchDir | Out-Null
}

$connStr = "Server=56.126.50.39,39533;Database=dbSuporte;User Id=ALAN1;Password=@@mnt;Encrypt=True;TrustServerCertificate=True;Connect Timeout=20;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "Conectado ao SQL Server dbSuporte com sucesso."

$cmdProc = $conn.CreateCommand()
$cmdProc.CommandText = @"
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
"@

$rProc = $cmdProc.ExecuteReader()
$processamentos = [System.Collections.Generic.List[object]]::new()

while ($rProc.Read()) {
    $processamentos.Add([pscustomobject]@{
        id = if ($rProc['id'] -ne [DBNull]::Value) { $rProc['id'].ToString() } else { $null }
        transportadora_id = if ($rProc['transportadora_id'] -ne [DBNull]::Value) { $rProc['transportadora_id'].ToString() } else { $null }
        nome_empresa = if ($rProc['nome_empresa'] -ne [DBNull]::Value) { $rProc['nome_empresa'].ToString() } else { $null }
        nome_base = if ($rProc['nome_base'] -ne [DBNull]::Value) { $rProc['nome_base'].ToString() } else { $null }
        cnpj = if ($rProc['cnpj'] -ne [DBNull]::Value) { $rProc['cnpj'].ToString() } else { $null }
        quinzena = if ($rProc['quinzena'] -ne [DBNull]::Value) { [int]$rProc['quinzena'] } else { 1 }
        mes = if ($rProc['mes'] -ne [DBNull]::Value) { [int]$rProc['mes'] } else { 1 }
        ano = if ($rProc['ano'] -ne [DBNull]::Value) { [int]$rProc['ano'] } else { 2026 }
        processo = if ($rProc['processo'] -ne [DBNull]::Value) { $rProc['processo'].ToString() } else { $null }
        status = if ($rProc['status'] -ne [DBNull]::Value) { $rProc['status'].ToString() } else { 'NAO_INICIADO' }
        segundos_processamento = if ($rProc['segundos_processamento'] -ne [DBNull]::Value) { [int]$rProc['segundos_processamento'] } else { 0 }
        registros_processados = if ($rProc['registros_processados'] -ne [DBNull]::Value) { [int]$rProc['registros_processados'] } else { 0 }
        data_inicio = if ($rProc['data_inicio'] -ne [DBNull]::Value) { ([datetime]$rProc['data_inicio']).ToString("o") } else { $null }
        data_fim = if ($rProc['data_fim'] -ne [DBNull]::Value) { ([datetime]$rProc['data_fim']).ToString("o") } else { $null }
        created_at = if ($rProc['created_at'] -ne [DBNull]::Value) { ([datetime]$rProc['created_at']).ToString("o") } else { $null }
        updated_at = if ($rProc['updated_at'] -ne [DBNull]::Value) { ([datetime]$rProc['updated_at']).ToString("o") } else { $null }
    })
}
$rProc.Close()
$conn.Close()

Write-Host "Total de registros lidos de shopee_processamentos no SQL Server: $($processamentos.Count)"

$jsonPath = Join-Path $scratchDir "shopee_processamentos_sql_server.json"
$processamentos | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8
Write-Host "Arquivo JSON gerado em: $jsonPath"
