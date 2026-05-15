# ─────────────────────────────────────────────────────────────────────────────
# revert-to-daisyui.ps1
# Reverts the entire frontend to the DaisyUI v5 state before the shadcn migration.
#
# Usage (run from project root or scripts/):
#   powershell -ExecutionPolicy Bypass -File scripts\revert-to-daisyui.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $projectRoot

Write-Host "Reverting to DaisyUI baseline (tag: v-daisyui)..." -ForegroundColor Cyan

# Reset ALL tracked files to the baseline tag
git checkout v-daisyui -- .

# Restore node_modules to match baseline package.json
Write-Host "Restoring packages (npm install)..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Done. Reverted to DaisyUI v5 state." -ForegroundColor Green
Write-Host "Run 'npm run dev' to verify." -ForegroundColor Green
