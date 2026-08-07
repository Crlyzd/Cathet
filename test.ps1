# ============================================================
# test.ps1 - CleanPad Rust + Tauri v2 Test & Runner Script
# ============================================================
# Usage:
#   .\test.ps1           -> Runs CleanPad in live development mode
#   .\test.ps1 -Dev      -> Live development mode
#   .\test.ps1 -Check    -> Run build & compilation checks (Cargo & TypeScript)
#   .\test.ps1 -Build    -> Build release binary and launch CleanPad executable
# ============================================================

param(
    [switch]$Dev,
    [switch]$Check,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                CleanPad - Rust + Tauri v2                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Environment Checks
Write-Host "[1/3] Checking environment..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed or not in PATH."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is not installed or not in PATH."
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw "Rust (cargo) is not installed or not in PATH."
}

Write-Host " -> Environment verified." -ForegroundColor Gray

# 2. Check Node Dependencies & Release File Locks
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[2/3] Node modules verified." -ForegroundColor Green
}

# Stop leftover cleanpad processes to prevent OS error 32 (file lock) during compilation
Stop-Process -Name "cleanpad" -Force -ErrorAction SilentlyContinue

# 3. Execution Mode Dispatch
if ($Check) {
    Write-Host "[3/3] Running automated compilation checks..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "--- Frontend TypeScript Build Check ---" -ForegroundColor Cyan
    npm run build
    Write-Host ""
    Write-Host "--- Rust Backend Cargo Check ---" -ForegroundColor Cyan
    cargo check --manifest-path src-tauri/Cargo.toml
    Write-Host ""
    Write-Host "All checks passed successfully!" -ForegroundColor Green
    exit 0
}

if ($Build) {
    Write-Host "[3/3] Building production release executable..." -ForegroundColor Yellow
    npx tauri build
    $exePath = Join-Path $ProjectRoot "src-tauri\target\release\cleanpad.exe"
    if (Test-Path $exePath) {
        Write-Host ""
        Write-Host "Release build successful." -ForegroundColor Green
        Write-Host "Launching CleanPad..." -ForegroundColor Cyan
        Start-Process -FilePath $exePath
    } else {
        Write-Host ""
        Write-Host "Build complete. Check src-tauri/target/release for binary." -ForegroundColor Green
    }
    exit 0
}

# Default: Dev Live Hot-Reload Mode
Write-Host "[3/3] Launching CleanPad in live development mode..." -ForegroundColor Yellow
Write-Host " -> Press Ctrl+C in terminal to stop dev server." -ForegroundColor Gray
Write-Host ""

npx tauri dev
