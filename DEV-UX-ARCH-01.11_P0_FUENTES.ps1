# DEV-UX-ARCH-01.11 — Insumos focalizados para implementar Resumen Operativo
# Compatible con Windows PowerShell 5.1. Solo lectura del repositorio.
param([string]$Repo = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Repo).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $root "DEV-UX-ARCH-01.11_P0_$stamp.zip"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) "nook-ux-0111-$stamp"
New-Item -ItemType Directory -Path $temp -Force | Out-Null
$paths = @(
 'app/operacion/resumen/page.tsx',
 'app/operacion/layout.tsx',
 'components/platform/PlatformShell.tsx',
 'components/operations/OperationSummary.tsx',
 'app/api/operacion/summary/route.ts',
 'lib/operation-rbac.ts',
 'lib/platform-navigation.ts',
 'lib/operation-auth.ts',
 'app/operacion/components/AdminClienteDetalle.tsx',
 'app/operacion/components/UltimosMovimientosCard.tsx',
 'app/operacion/components/OperacionSuscripcionActiva.tsx',
 'app/operacion/components/UltimosMovimientos.tsx',
 'app/api/operacion/clientes/route.ts',
 'app/api/dashboard/overview/route.ts',
 'docs/DEV-UX-ARCH-01.9_MASTER_PLAN.md'
)
$manifest = New-Object 'System.Collections.Generic.List[string]'
foreach ($rel in $paths) {
  $src = Join-Path $root ($rel -replace '/', '\')
  if (Test-Path -LiteralPath $src -PathType Leaf) {
    $dst = Join-Path $temp ($rel -replace '/', '\')
    $dir = Split-Path -Parent $dst
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst
    $manifest.Add("OK: $rel")
  } else { $manifest.Add("NO EXISTE: $rel") }
}
# Inventario acotado de endpoints y referencias a métricas. No copia secretos ni .env.
$api = Join-Path $root 'app/api'
if (Test-Path -LiteralPath $api) {
  Get-ChildItem -LiteralPath $api -Recurse -File -Filter 'route.ts' |
    Where-Object { $_.FullName -match 'loyal|reward|stamp|customer|cliente|subscription|operacion|dashboard|sale|campaign' } |
    ForEach-Object { $manifest.Add('API: ' + $_.FullName.Substring($root.Length + 1)) }
}
[System.IO.File]::WriteAllLines((Join-Path $temp 'MANIFEST.txt'), $manifest.ToArray(), (New-Object System.Text.UTF8Encoding($false)))
try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $out)
  Write-Host "ZIP creado: $out"
  Write-Host 'Adjunta este ZIP al chat. No modifica archivos del repositorio.'
} finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
