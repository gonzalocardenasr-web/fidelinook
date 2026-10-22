# DEV-UX-ARCH-01.10 / P0 - Solo lectura, PowerShell 5.1
# Ejecutar desde la raiz del repositorio. No modifica codigo ni configuracion.
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'app\operacion\page.tsx')) -or -not (Test-Path (Join-Path $root 'lib\platform-navigation.ts'))) {
  throw 'Ejecutar desde la raiz del repositorio (deben existir app/operacion/page.tsx y lib/platform-navigation.ts).'
}
$out = Join-Path $root 'DEV-UX-ARCH-01.10_P0_DIAGNOSTICO.txt'
$lines = New-Object 'System.Collections.Generic.List[string]'
function Add-Line([string]$s) { [void]$lines.Add($s) }
function Read-Target([string]$path, [string]$pattern, [int]$max = 90) {
  Add-Line "`n===== $path ====="
  $full = Join-Path $root $path
  if (-not (Test-Path -LiteralPath $full)) { Add-Line 'NO EXISTE'; return }
  $content = @(Get-Content -LiteralPath $full)
  Add-Line ('Lineas: ' + $content.Count)
  $count = 0
  for ($i=0; $i -lt $content.Count; $i++) {
    if ($content[$i] -match $pattern) {
      # Solo referencias y declaraciones; no copiar valores de credenciales ni variables de entorno.
      $value = $content[$i].Trim()
      if ($value -match '(?i)(password|secret|token|api.key|authorization|service.role|process\.env)') { $value = '[LINEA OMITIDA: posible informacion sensible]' }
      if ($value.Length -gt 210) { $value = $value.Substring(0,210) + '...' }
      Add-Line (('{0}: {1}' -f ($i+1), $value))
      $count++
      if ($count -ge $max) { Add-Line '[LIMITE DE COINCIDENCIAS]'; break }
    }
  }
  if ($count -eq 0) { Add-Line 'Sin coincidencias' }
}
Add-Line 'DEV-UX-ARCH-01.10 - P0 / AUDITORIA DE NAVEGACION Y DEPENDENCIAS'
Add-Line ('Fecha local: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line 'Solo lectura. No contiene variables de entorno ni contenidos completos de archivos.'
Read-Target 'lib\platform-navigation.ts' 'PLATFORM_NAVIGATION|section:|label:|href:|permission:|getPlatformNavigation|PlatformNavigationSection' 110
Read-Target 'lib\operation-rbac.ts' 'OperationPermission|PERMISSIONS|authorizeOperationSession|hasOperationPermission|cashier:|admin:|superadmin:|preparation:' 95
Read-Target 'components\platform\PlatformShell.tsx' 'pathname|router\.|redirect|replace\(|push\(|href=|getPlatformNavigation|preparation|children|session|role|nav' 95
Read-Target 'app\operacion\layout.tsx' 'auth|session|role|redirect|PlatformShell|children' 50
Read-Target 'app\operacion\page.tsx' 'import |export default|function |OperationSummary|UltimosMovimientos|AdminClienteDetalle|Suscripcion|/api/|href=|rol|role' 100
Read-Target 'components\operations\OperationSummary.tsx' 'import |export default|function |/api/|fetch\(|return |h[1-4]|role|session' 80
Read-Target 'app\page.tsx' 'import |export default|redirect|router\.|href=|session|role|fetch\(' 65
Read-Target 'app\admin\page.tsx' 'import |export default|redirect|router\.|href=|session|role' 45
Read-Target 'app\admin\login\page.tsx' 'import |export default|redirect|router\.|replace\(|push\(|href=|/api/|role|session' 60
Read-Target 'app\api\session\route.ts' 'export async|role|session|status|permission|cookie' 60
Add-Line "`n===== RUTAS Y REFERENCIAS A DESTINOS DE ENTRADA ====="
$roots = @('app','components','lib')
$pattern = '/operacion(/ventas/nueva|/cola|/ventas|/resumen)?["''`? ]|/admin/login|router\.(push|replace)\(|redirect\('
$hits = 0
foreach ($dir in $roots) {
  $folder = Join-Path $root $dir
  if (-not (Test-Path $folder)) { continue }
  $files = Get-ChildItem -LiteralPath $folder -Recurse -File -Include '*.ts','*.tsx' | Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.next)[\\/]' }
  foreach ($file in $files) {
    $matches = @(Select-String -LiteralPath $file.FullName -Pattern $pattern -AllMatches)
    foreach ($m in $matches) {
      $relative = $file.FullName.Substring($root.Length + 1)
      $snippet = $m.Line.Trim()
      if ($snippet -match '(?i)(password|secret|token|api.key|authorization|service.role|process\.env)') { $snippet = '[LINEA OMITIDA: posible informacion sensible]' }
      if ($snippet.Length -gt 170) { $snippet = $snippet.Substring(0,170) + '...' }
      Add-Line (('{0}:{1}: {2}' -f $relative, $m.LineNumber, $snippet))
      $hits++
      if ($hits -ge 350) { break }
    }
    if ($hits -ge 350) { break }
  }
  if ($hits -ge 350) { break }
}
Add-Line ('Coincidencias totales registradas: ' + $hits)
Add-Line "`n===== ARCHIVOS EXISTENTES DE DESTINO ====="
foreach ($p in @('app\operacion\resumen\page.tsx','app\operacion\pos\page.tsx','app\operacion\preparacion\page.tsx','docs\DEV-UX-ARCH-01.9_MASTER_PLAN.md','docs\STATUS_PACK.md')) {
  Add-Line ($p + ': ' + (Test-Path (Join-Path $root $p)))
}
[System.IO.File]::WriteAllLines($out, $lines, (New-Object System.Text.UTF8Encoding($true)))
Write-Host "Diagnostico generado: $out" -ForegroundColor Green
Write-Host 'Comparte el TXT. No ejecutar cambios de codigo todavia.' -ForegroundColor Yellow
