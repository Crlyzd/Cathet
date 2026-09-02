<#
.SYNOPSIS
    build.ps1 - Cathet Build & Dev Automation Script

.DESCRIPTION
    Automates live development hot-reloading and ultra-compact production compilation
    for Windows x64 (x86_64-pc-windows-msvc) and Windows ARM64 (aarch64-pc-windows-msvc).

.EXAMPLE
    .\build.ps1 -Live          # Launch live development mode with hot reload
    .\build.ps1 -BuildX64      # Build size-optimized x64 binary
    .\build.ps1 -BuildArm64    # Build size-optimized ARM64 binary
    .\build.ps1 -All           # Build both x64 and ARM64 releases
    .\build.ps1 -Check         # Verification check (Frontend + Rust)
#>

param(
    [switch]$Live,
    [switch]$Dev,
    [switch]$BuildX64,
    [switch]$BuildArm64,
    [switch]$All,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "               Cathet - Rust + Tauri v2 Build               " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Stop any running Cathet instances to release file locks
Stop-Process -Name "cathet" -Force -ErrorAction SilentlyContinue

# Verify environment tools
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not installed." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is not installed." }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw "Rust (cargo) is not installed." }

# Mode: Verification Check
if ($Check) {
    Write-Host "[Check] Running frontend TypeScript & Vite build..." -ForegroundColor Yellow
    npm run build
    Write-Host "[Check] Running backend Cargo check..." -ForegroundColor Yellow
    cargo check --manifest-path src-tauri/Cargo.toml
    Write-Host "All checks passed successfully!" -ForegroundColor Green
    exit 0
}

# Function to compile a specific target architecture
function Build-Target([string]$targetName, [string]$label) {
    Write-Host ""
    Write-Host ">>> Compiling smallest possible release for $label ($targetName)..." -ForegroundColor Yellow
    
    # 1. Build frontend assets
    npm run build

    # 2. Compile Rust backend with release size optimization flags
    $manifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
    cargo build --release --target $targetName --manifest-path $manifest

    $binPath = Join-Path $ProjectRoot "src-tauri\target\$targetName\release\cathet.exe"
    if (Test-Path $binPath) {
        $fileInfo = Get-Item $binPath
        $sizeMb = [math]::Round($fileInfo.Length / 1MB, 2)
        $sizeKb = [math]::Round($fileInfo.Length / 1KB, 0)
        Write-Host "Build complete: $binPath" -ForegroundColor Green
        Write-Host "Binary size ($label): $sizeMb MB ($sizeKb KB)" -ForegroundColor Cyan
    } else {
        Write-Warning "Binary not found at expected path: $binPath"
    }
}

# Mode: Build Both x64 and ARM64
if ($All) {
    Build-Target "x86_64-pc-windows-msvc" "Windows x64"
    Build-Target "aarch64-pc-windows-msvc" "Windows ARM64"
    Write-Host ""
    Write-Host "All targets compiled successfully!" -ForegroundColor Green
    exit 0
}

# Mode: Build ARM64
if ($BuildArm64) {
    Build-Target "aarch64-pc-windows-msvc" "Windows ARM64"
    exit 0
}

# Mode: Build x64
if ($BuildX64) {
    Build-Target "x86_64-pc-windows-msvc" "Windows x64"
    exit 0
}

# Mode: Live Development (Default or -Live / -Dev)
Write-Host "Launching Cathet in live development mode (Hot Reload)..." -ForegroundColor Yellow
Write-Host " -> Press Ctrl+C in terminal to stop dev server." -ForegroundColor Gray
Write-Host ""

npx tauri dev
