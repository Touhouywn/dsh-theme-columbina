# Columbina voice — remove from a DSH profile.

[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [switch]$Purge
)

$ErrorActionPreference = 'Stop'
$profileDir = Join-Path $DshHome "profiles\$Profile"
$dest = Join-Path $DshHome 'plugins\columbina-voice'
$link = Join-Path $profileDir 'node_modules\dsh-plugin-columbina-voice'
$patch = Join-Path $profileDir 'cordis.patch.yml'

if (-not (Test-Path -LiteralPath $profileDir)) { throw "DSH profile not found: $profileDir" }

if (Test-Path -LiteralPath $link) {
  $existing = Get-Item -LiteralPath $link -Force
  if ($existing.LinkType) { $existing.Delete() } else { Remove-Item -LiteralPath $link -Recurse -Force }
  Write-Host 'junction -> removed' -ForegroundColor Green
}

if (Test-Path -LiteralPath $patch) {
  $raw = [System.IO.File]::ReadAllText($patch)
  $pattern = '(?ms)^# ---- columbina-voice:.*?^[ \t]+name: dsh-plugin-columbina-voice[ \t]*\r?\n'
  $next = [regex]::Replace($raw, $pattern, '')
  if ($next -eq $raw) {
    $next = [regex]::Replace($raw, '(?ms)^- insert:\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+- id: columbina-voice\r?\n(?:[ \t]+.*\r?\n)*?(?=^- |\z)', '')
  }
  if ($next -ne $raw) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    Copy-Item -LiteralPath $patch -Destination "$patch.bak-columbina-voice-remove-$stamp" -Force
    [System.IO.File]::WriteAllText($patch, $next, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'patch    -> columbina-voice row removed' -ForegroundColor Green
  } else {
    Write-Host 'patch    -> no columbina-voice row found' -ForegroundColor Yellow
  }
}

if ($Purge -and (Test-Path -LiteralPath $dest)) {
  Remove-Item -LiteralPath $dest -Recurse -Force
  Write-Host "files    -> $dest deleted" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Done. Refresh the DSH page.' -ForegroundColor Cyan
