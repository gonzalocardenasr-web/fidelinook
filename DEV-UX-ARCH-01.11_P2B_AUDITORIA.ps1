param([string]$Repo = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Repo).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $root "DEV-UX-ARCH-01.11_P2B_AUDITORIA_$stamp.txt"
$patterns = @('customer_rewards','redeemed_at','redeemed','reward_id','reward_status','loyalty_movements','stamp_delta','reward_generated','reward_redeemed','prize_redeemed')
$folders = @('app','lib','components','supabase','database','sql','migrations')
$files = @()
foreach ($folder in $folders) {
  $full = Join-Path $root $folder
  if (Test-Path -LiteralPath $full) {
    $files += Get-ChildItem -LiteralPath $full -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in @('.ts','.tsx','.sql') -and $_.FullName -notmatch '[\\/](node_modules|\.next|\.git)[\\/]' }
  }
}
$files = @($files | Sort-Object FullName -Unique)
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('DEV-UX-ARCH-01.11 P2B - AUDITORIA SOLO LECTURA')
[void]$sb.AppendLine("Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine('No exporta datos de clientes ni variables de entorno.')
foreach ($file in $files) {
  $relative = $file.FullName.Substring($root.Length).TrimStart('\','/')
  $lines = [System.IO.File]::ReadAllLines($file.FullName)
  $hits = @()
  for ($i=0; $i -lt $lines.Length; $i++) {
    foreach ($pattern in $patterns) {
      if ($lines[$i].IndexOf($pattern,[System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $hits += $i; break
      }
    }
  }
  if ($hits.Count -eq 0) { continue }
  [void]$sb.AppendLine("`r`n===== $relative ($($lines.Length) lineas; $($hits.Count) coincidencias) =====")
  foreach ($index in $hits) {
    $start = [Math]::Max(0,$index-3)
    $end = [Math]::Min($lines.Length-1,$index+5)
    [void]$sb.AppendLine("--- coincidencia en linea $($index+1) ---")
    for ($j=$start; $j -le $end; $j++) {
      $line = $lines[$j]
      if ($line -match '(?i)(password|secret|token|api[_-]?key|authorization|bearer)\s*[:=]') { $line = '[LINEA OMITIDA: posible secreto]' }
      [void]$sb.AppendLine("$($j+1): $line")
    }
  }
}
[System.IO.File]::WriteAllText($out,$sb.ToString(),(New-Object System.Text.UTF8Encoding($false)))
Write-Host "Auditoria creada: $out"
Write-Host 'Revisar el TXT antes de compartir para descartar datos sensibles.'
