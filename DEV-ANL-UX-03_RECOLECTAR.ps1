$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'app'))) { throw 'Ejecutar desde la raiz de fidelinook (debe existir carpeta app).' }
$dest = Join-Path $root 'DEV-ANL-UX-03_FUENTES.zip'
$tmp = Join-Path $env:TEMP ('nook-anl-ux03-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
  $paths = @(
    'app/gestion/analytics',
    'components/analytics',
    'components/platform',
    'app/operacion',
    'app/gestion/layout.tsx',
    'app/layout.tsx',
    'app/globals.css'
  )
  $includeExt = @('.tsx','.ts','.css','.scss')
  $exclude = @('node_modules','.next','.git','backup','backups')
  $count = 0
  foreach ($p in $paths) {
    $full = Join-Path $root ($p -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $full)) { continue }
    $files = if (Test-Path $full -PathType Leaf) { @(Get-Item $full) } else { @(Get-ChildItem $full -File -Recurse -ErrorAction SilentlyContinue) }
    foreach ($f in $files) {
      if ($includeExt -notcontains $f.Extension.ToLowerInvariant()) { continue }
      $rel = $f.FullName.Substring($root.Length).TrimStart('\','/')
      if (($exclude | Where-Object { $rel -match ('(^|[\\/])' + [regex]::Escape($_) + '([\\/]|$)') }).Count -gt 0) { continue }
      if ($rel -match 'app[\\/]operacion' -and $rel -notmatch '(layout|page|pos|operacion|shell|workspace|\.module\.css)') { continue }
      $target = Join-Path $tmp $rel
      New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
      Copy-Item $f.FullName $target -Force
      $count++
    }
  }
  if (Test-Path $dest) { Remove-Item $dest -Force }
  Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $dest -CompressionLevel Optimal
  Write-Host "OK: $dest ($count archivos). Adjunta este ZIP en el chat."
} finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
