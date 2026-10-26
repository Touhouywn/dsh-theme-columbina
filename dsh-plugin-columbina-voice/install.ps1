# Columbina voice — install into a DSH profile.
#
#   pwsh -File .\install.ps1
#
# Copies the package to %DSH_HOME%\plugins\columbina-voice, links it into the
# profile's node_modules and appends one insert row to cordis.patch.yml.

[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [switch]$Purge
)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$profileDir = Join-Path $DshHome "profiles\$Profile"
$dest = Join-Path $DshHome 'plugins\columbina-voice'
$link = Join-Path $profileDir 'node_modules\dsh-plugin-columbina-voice'
$patch = Join-Path $profileDir 'cordis.patch.yml'

if (-not (Test-Path -LiteralPath $profileDir)) { throw "DSH profile not found: $profileDir" }

if ($Purge -and (Test-Path -LiteralPath $dest)) { Remove-Item -LiteralPath $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($item in @('package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'assets', 'locale', 'README.md')) {
  $from = Join-Path $source $item
  if (-not (Test-Path -LiteralPath $from)) { throw "Package is incomplete, missing: $from" }
  $to = Join-Path $dest $item
  if (Test-Path -LiteralPath $to) { Remove-Item -LiteralPath $to -Recurse -Force }
  Copy-Item -LiteralPath $from -Destination $to -Recurse -Force
}
Write-Host "package  -> $dest" -ForegroundColor Green

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $link) | Out-Null
if (Test-Path -LiteralPath $link) {
  $existing = Get-Item -LiteralPath $link -Force
  if ($existing.LinkType) { $existing.Delete() } else { Remove-Item -LiteralPath $link -Recurse -Force }
}
New-Item -ItemType Junction -Path $link -Target $dest | Out-Null
Write-Host "junction -> $link" -ForegroundColor Green

$raw = [System.IO.File]::ReadAllText($patch)
if ($raw.Trim() -eq '[]') {
  $raw = "# Your patch layer for this dsh profile, applied after every bundle layer:`n"
  [System.IO.File]::WriteAllText($patch, $raw, (New-Object System.Text.UTF8Encoding($false)))
}
if ($raw -notmatch 'columbina-voice') {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -LiteralPath $patch -Destination "$patch.bak-columbina-voice-$stamp" -Force
  $nl = if ($raw -match "`r`n") { "`r`n" } else { "`n" }
  $block = @(
    '# ---- columbina-voice: 哥伦比娅语音（禁用：给条目加 disabled: true）----'
    '- insert:'
    '    - id: columbina-voice'
    '      name: dsh-plugin-columbina-voice'
    '      config:'
    '        mode: clips'
    '        threshold: 0.32'
    '        maxClips: 3'
  ) -join $nl
  $prefix = if ($raw.Length -eq 0 -or $raw.EndsWith($nl)) { '' } else { $nl }
  [System.IO.File]::AppendAllText($patch, $prefix + $block + $nl, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "patch    -> appended columbina-voice row" -ForegroundColor Green
} else {
  Write-Host "patch    -> already present" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done. Restart DSH once so the client module loads.' -ForegroundColor Cyan
