param(
    [Parameter(Mandatory=$true)]
    [string]$ArquivoSql
)

$ErrorActionPreference = "Stop"
$connStr = "Server=56.126.50.39,39533;Database=dbSuporte;User Id=ALAN1;Password=@@mnt;Encrypt=True;TrustServerCertificate=True;Connect Timeout=20;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
Write-Host "Conectado ao SQL Server dbSuporte."

$content = Get-Content $ArquivoSql -Raw -Encoding UTF8
$batches = $content -split "(?m)^\s*GO\s*$"

foreach ($batch in $batches) {
    $sql = $batch.Trim()
    if ($sql) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sql
        [void]$cmd.ExecuteNonQuery()
    }
}

$conn.Close()
Write-Host "Script '$ArquivoSql' executado com sucesso no SQL Server!"
