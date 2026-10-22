# DEV-UX-ARCH-01.11 P2: fuentes reales de metricas CRM/fidelizacion
# PowerShell 5.1; solo lectura; excluye secretos y datos de clientes.
param([string]$Repo = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Repo).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $root "DEV-UX-ARCH-01.11_P2_FUENTES_$stamp.zip"
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "nook-0111-p2-$stamp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$manifest = New-Object 'System.Collections.Generic.List[string]'
$paths = @(
 'app/api/operacion/summary/route.ts',
 'app/api/dashboard/overview/route.ts',
 'app/api/operacion/sales/route.ts',
 'app/api/operacion/sales/customer/route.ts',
 'app/api/operacion/customers/[customerId]/loyalty/route.ts',
 'app/api/operacion/clientes/route.ts',
 'app/api/clientes/register-card/route.ts',
 'app/api/operacion/orders/route.ts',
 'app/operacion/resumen/page.tsx',
 'components/operations/OperationSummary.tsx',
 'lib/operation-rbac.ts',
 'docs/DEV-UX-ARCH-01.9_MASTER_PLAN.md'
)
foreach ($rel in $paths) {
 $src = Join-Path $root ($rel -replace '/', '\')
 if (Test-Path -LiteralPath $src -PathType Leaf) {
  $dest = Join-Path $tmp ($rel -replace '/', '\')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -LiteralPath $src -Destination $dest
  $manifest.Add("OK: $rel")
 } else { $manifest.Add("NO EXISTE: $rel") }
}
# Agrega exclusivamente codigo fuente de rutas pertinentes; sin .env, datos, backups ni dumps.
$apiRoot = Join-Path $root 'app\api'
if (Test-Path -LiteralPath $apiRoot) {
 Get-ChildItem -LiteralPath $apiRoot -Recurse -File -Filter 'route.ts' | Where-Object {
  $relative = $_.FullName.Substring($root.Length + 1).Replace('\','/')
  $relative -match '(loyal|reward|stamp|prize|premio|sello|daily-crm|register|registro|subscription|send-stamp|send-prize|redeem|recover-card|reminder-expiring)'
 } | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length + 1)
  $dest = Join-Path $tmp $relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
  $manifest.Add("API: $relative")
 }
}
# Inventario de migraciones SQL pertinentes: solo nombres, sin copiar dumps.
$mig = Join-Path $root 'supabase\migrations'
if (Test-Path -LiteralPath $mig) {
 Get-ChildItem -LiteralPath $mig -File -Filter '*.sql' | Where-Object { $_.Name -match '(loyal|reward|stamp|customer|client|sales|order|prize)' } |
  ForEach-Object { $manifest.Add('MIGRACION: ' + $_.Name) }
}
[System.IO.File]::WriteAllLines((Join-Path $tmp 'MANIFEST.txt'),$manifest.ToArray(),(New-Object System.Text.UTF8Encoding($false)))
try {
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 [System.IO.Compression.ZipFile]::CreateFromDirectory($tmp,$out)
 Write-Host "ZIP creado: $out"
 Write-Host 'Solo lectura. Adjunta el ZIP; no incluye .env ni datos de clientes.'
} finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
