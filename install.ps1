# Columbina · 月下摇篮 — install the theme, its sidebar hub, and the persona.
#
#   pwsh -File .\install.ps1
#   pwsh -File .\install.ps1 -Profile web
#   pwsh -File .\install.ps1 -DshHome D:\dsh-data
#
# Every package is installed through its own, individually idempotent script.

[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' })
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host '== Columbina theme ==' -ForegroundColor Cyan
& (Join-Path $root 'dsh-theme-columbina\install.ps1') -Profile $Profile -DshHome $DshHome

Write-Host ''
Write-Host '== Columbina persona (conversation voice) ==' -ForegroundColor Cyan
& (Join-Path $root 'dsh-plugin-columbina-persona\install.ps1') -Profile $Profile -DshHome $DshHome

Write-Host ''
Write-Host '== Moonlit Cradle hub (sidebar entry) ==' -ForegroundColor Cyan
& (Join-Path $root 'dsh-plugin-columbina\install.ps1') -Profile $Profile -DshHome $DshHome

Write-Host ''
Write-Host 'Done. Fully quit and reopen DSH once so the Client declarations reload.' -ForegroundColor Cyan
Write-Host 'If the sidebar does not show 月下摇篮 after the restart, check:' -ForegroundColor Cyan
Write-Host '  <DshHome>\profiles\<Profile>\cordis.patch.yml' -ForegroundColor Cyan
