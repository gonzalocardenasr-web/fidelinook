# DEV-UX-ARCH-01.10 / P1 - Fuentes acotadas para parche seguro
# PowerShell 5.1 - Solo lectura
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$files = @(
 'lib/platform-navigation.ts',
 'lib/operation-rbac.ts',
 'components/platform/PlatformShell.tsx',
 'app/operacion/page.tsx',
 'app/operacion/layout.tsx',
 'app/admin/page.tsx',
 'app/admin/login/page.tsx',
 'app/page.tsx',
 'components/operations/OperationSummary.tsx',
 'app/api/operacion/summary/route.ts'
)
$missing = @($files | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root $_)) })
if ($missing.Count -gt 0) { throw ('Faltan archivos requeridos: ' + ($missing -join ', ')) }
$zipPath = Join-Path $root 'DEV-UX-ARCH-01.10_P1_FUENTES.zip'
if (Test-Path -LiteralPath $zipPath) { throw 'Ya existe el ZIP de salida. Renombralo o eliminalo antes de continuar.' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
 foreach ($relative in $files) {
  $full = Join-Path $root $relative
  $entry = $relative.Replace('\','/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, $entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
 }
} finally { $zip.Dispose() }
Write-Host ('OK - ZIP generado: ' + $zipPath)
Write-Host ('Archivos incluidos: ' + $files.Count)
Write-Host 'Solo codigo fuente seleccionado. No se incluyen .env, secretos, node_modules ni datos.'
