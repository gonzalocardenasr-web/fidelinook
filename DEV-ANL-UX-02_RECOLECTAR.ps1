# DEV-ANL-UX-02: recopilar solo codigo necesario; no modifica repositorio.
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'app\gestion\analytics'))) { throw 'Ejecuta desde la raiz del repositorio fidelinook.' }
$target = Join-Path $root 'DEV-ANL-UX-02_FUENTES.zip'
$items = @(
 'app\gestion\analytics\page.tsx',
 'app\gestion\analytics\layout.tsx',
 'app\gestion\analytics\comercial\page.tsx',
 'app\gestion\analytics\comercial\AnalyticsCommercialWorkspace.tsx',
 'app\gestion\analytics\comercial\commercial.module.css',
 'app\gestion\analytics\comercial\ventas\page.tsx',
 'app\gestion\analytics\comercial\ventas\SalesEvolution.tsx',
 'app\gestion\analytics\comercial\ventas\sales-evolution.module.css',
 'app\gestion\analytics\comercial\ventas\temporalidad\page.tsx',
 'app\gestion\analytics\comercial\ventas\temporalidad\Temporalidad.tsx',
 'app\gestion\analytics\comercial\ventas\canales\page.tsx',
 'app\gestion\analytics\comercial\ventas\canales\Channels.tsx',
 'app\gestion\analytics\comercial\ventas\canales\channels.module.css',
 'components\analytics\AnalyticsToolbar.tsx',
 'components\analytics\analytics-toolbar.module.css'
)
$files = @($items | Where-Object { Test-Path (Join-Path $root $_) })
$files += @(Get-ChildItem -Path (Join-Path $root 'app\gestion\analytics') -Recurse -File -Include '*.tsx','*.css' | Where-Object { $_.FullName -match 'productos|sabores' } | ForEach-Object { $_.FullName.Substring($root.Length+1) })
$files = @($files | Sort-Object -Unique)
if ($files.Count -eq 0) { throw 'No se encontraron fuentes.' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $target) { Remove-Item $target -Force }
$zip = [System.IO.Compression.ZipFile]::Open($target, [System.IO.Compression.ZipArchiveMode]::Create)
try {
 foreach ($f in $files) {
  $full = Join-Path $root $f
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, ($f -replace '\\','/'), [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
 }
} finally { $zip.Dispose() }
Write-Host "ZIP creado: $target" -ForegroundColor Green
Write-Host "Archivos incluidos: $($files.Count)"
