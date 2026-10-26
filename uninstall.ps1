# NSSM-style uninstaller for the three Columbina packages.

[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [switch]$Purge
)

$ErrorActionPreference = 'Stop'
$profileDir = Join-Path $DshHome "profiles\$Profile"
$patch = Join-Path $profileDir 'cordis.patch.yml'

if (-not (Test-Path -LiteralPath $profileDir)) {
  throw "DSH profile not found: $profileDir"
}

# 1. Remove the loader rows and their whole comment blocks from the patch. The
#    blocks are contiguous, so a line filter is enough and keeps the rest of the
#    file (other plugins, user edits) untouched.
if (Test-Path -LiteralPath $patch) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -LiteralPath $patch -Destination "$patch.bak-columbina-uninstall-$stamp" -Force
  $lines = Get-Content -LiteralPath $patch
  $kept = New-Object System.Collections.Generic.List[string]
  $skip = 0
  foreach ($line in $lines) {
    if ($line -match '^# ---- (theme-columbina|columbina-hub|columbina-persona):') {
      $skip = 1
      continue
    }
    if ($skip -gt 0) {
      if ($line -match '^- insert:') { $skip = 2; continue }
      if ($line -match '^    - id: (theme-columbina|columbina-hub|columbina-persona)$') { $skip = 3; continue }
      if ($skip -eq 3 -and $line -match '^      name: (dsh-theme-columbina|dsh-plugin-columbina|dsh-plugin-columbina-persona)$') { $skip = 4; continue }
      if ($skip -eq 4 -and $line -match '^      config:$') { $skip = 5; continue }
      if ($skip -eq 5 -and $line -match '^        enabled:') { $skip = 0; continue }
      $skip = 0
      $kept.Add($line)
      continue
    }
    $kept.Add($line)
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($patch, $kept, $utf8)
  Write-Host "patch    -> removed columbina rows from cordis.patch.yml" -ForegroundColor Green
}

# 2. Remove the junctions.
foreach ($name in @('dsh-theme-columbina', 'dsh-plugin-columbina', 'dsh-plugin-columbina-persona')) {
  $link = Join-Path $profileDir "node_modules\$name"
  if (Test-Path -LiteralPath $link) {
    $item = Get-Item -LiteralPath $link -Force
    if ($item.LinkType) { $item.Delete() } else { Remove-Item -LiteralPath $link -Recurse -Force }
    Write-Host "junction -> removed $link" -ForegroundColor Green
  }
}

# 3. Optionally delete the package copies.
if ($Purge) {
  foreach ($path in @('themes\columbina', 'plugins\columbina-hub', 'plugins\columbina-persona')) {
    $target = Join-Path $DshHome $path
    if (Test-Path -LiteralPath $target) {
      Remove-Item -LiteralPath $target -Recurse -Force
      Write-Host "purged   -> $target" -ForegroundColor Green
    }
  }
}

Write-Host ''
Write-Host '== Columbina voice ==' -ForegroundColor Cyan
$voiceUninstall = Join-Path $root 'dsh-plugin-columbina-voice\uninstall.ps1'
if (Test-Path -LiteralPath $voiceUninstall) {
  & $voiceUninstall -Profile $Profile -DshHome $DshHome -Purge:$Purge
}

Write-Host ''
Write-Host 'Done. Fully quit and reopen DSH to unload the Client halves.' -ForegroundColor Cyan
