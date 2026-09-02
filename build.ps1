<#
.SYNOPSIS
    build.ps1 - Cathet Unified Automation Pipeline (Interactive CLI, Dev, Build, Check, Bump)

.DESCRIPTION
    Interactive CLI and automated pipeline for live development, verification checks,
    SemVer version bumping, and size-optimized production builds for Windows (x64 and ARM64).
    Compiled binaries are placed in the dedicated 'release' folder at the root.

.EXAMPLE
    .\build.ps1                      # Interactive Pickable CLI Menu
    .\build.ps1 -Dev                 # Directly launch live dev mode
    .\build.ps1 -Check               # Run frontend & Rust compilation checks
    .\build.ps1 -Build               # Build native release -> release/cathet.exe
    .\build.ps1 -Build -Run          # Build release and immediately launch it
    .\build.ps1 -BuildX64            # Build x64 release -> release/cathet-x64.exe
    .\build.ps1 -BuildArm64          # Build ARM64 release -> release/cathet-arm64.exe
    .\build.ps1 -All                 # Build both x64 and ARM64 releases
    .\build.ps1 -Patch               # Bump version 1.0.0 -> 1.0.1
    .\build.ps1 -TargetVersion 1.2.3 # Explicit target version bump
#>

param(
    [switch]$Dev,
    [switch]$Live,
    [switch]$Check,
    [switch]$Build,
    [switch]$BuildX64,
    [switch]$BuildArm64,
    [switch]$All,
    [switch]$Run,
    [switch]$Patch,
    [switch]$Minor,
    [switch]$Major,
    [string]$TargetVersion,
    [string]$OutputDir = "release",
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$ReleaseDir = Join-Path $ProjectRoot $OutputDir

function Show-HelpGuide {
    Write-Host "Cathet Unified Automation Script" -ForegroundColor Cyan
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\build.ps1                        -> Interactive pickable CLI menu"
    Write-Host "  .\build.ps1 -Dev / -Live           -> Launch live dev mode (hot reload)"
    Write-Host "  .\build.ps1 -Check                 -> Run TypeScript build & Cargo check"
    Write-Host "  .\build.ps1 -Build [-Run]          -> Build release binary & save to '$OutputDir/'"
    Write-Host "  .\build.ps1 -BuildX64              -> Build x64 release binary"
    Write-Host "  .\build.ps1 -BuildArm64            -> Build ARM64 release binary"
    Write-Host "  .\build.ps1 -All                   -> Build both x64 and ARM64 binaries"
    Write-Host "  .\build.ps1 -Patch|-Minor|-Major   -> Bump version across all manifests"
    Write-Host "  .\build.ps1 -TargetVersion 1.2.3   -> Explicit version bump"
}

function Ensure-Environment {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not installed." }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is not installed." }
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw "Rust (cargo) is not installed." }
    $nodeModules = Join-Path $ProjectRoot "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
}

function Stop-ActiveProcesses {
    Stop-Process -Name "cathet" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "cleanpad" -Force -ErrorAction SilentlyContinue
}

function Invoke-CheckMode {
    Write-Host "[Check] Running frontend TypeScript & Vite build..." -ForegroundColor Yellow
    npm run build
    Write-Host "[Check] Running backend Cargo check..." -ForegroundColor Yellow
    cargo check --manifest-path (Join-Path $ProjectRoot "src-tauri\Cargo.toml")
    Write-Host "All checks passed successfully!" -ForegroundColor Green
}

function Invoke-VersionBump([string]$targetVer, [switch]$isPatch, [switch]$isMinor, [switch]$isMajor) {
    $pkgPath = Join-Path $ProjectRoot "package.json"
    $tauriPath = Join-Path $ProjectRoot "src-tauri\tauri.conf.json"
    $cargoPath = Join-Path $ProjectRoot "src-tauri\Cargo.toml"

    $currentVer = (Get-Content -Raw $pkgPath | ConvertFrom-Json).version
    Write-Host "Current Cathet version: $currentVer" -ForegroundColor Cyan

    $newVer = $targetVer
    if (-not $newVer) {
        $p = $currentVer.Split('.')
        $maj = [int]$p[0]; $min = [int]$p[1]; $pat = [int]$p[2]
        if ($isMajor) { $maj++; $min = 0; $pat = 0 }
        elseif ($isMinor) { $min++; $pat = 0 }
        elseif ($isPatch) { $pat++ }
        $newVer = "$maj.$min.$pat"
    }

    Write-Host "Bumping version to: $newVer" -ForegroundColor Green
    (Get-Content -Raw $pkgPath) -replace '"version":\s*"[^"]+"', """version"": ""$newVer""" | Set-Content $pkgPath -NoNewline
    (Get-Content -Raw $tauriPath) -replace '"version":\s*"[^"]+"', """version"": ""$newVer""" | Set-Content $tauriPath -NoNewline
    (Get-Content -Raw $cargoPath) -replace '(?m)^version\s*=\s*"[^"]+"', "version = ""$newVer""" | Set-Content $cargoPath -NoNewline

    Write-Host "Synchronizing Cargo.lock..." -ForegroundColor Gray
    cargo check --manifest-path $cargoPath --quiet
    Write-Host "Version bumped successfully: $currentVer -> $newVer" -ForegroundColor Green
}

function Compile-Target([string]$targetTriple, [string]$label, [string]$outputFileName) {
    Write-Host ""
    Write-Host ">>> Compiling smallest release for $label ($targetTriple)..." -ForegroundColor Yellow
    npm run build

    $manifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
    if ($targetTriple) {
        cargo build --release --target $targetTriple --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\$targetTriple\release\cathet.exe"
    } else {
        cargo build --release --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\release\cathet.exe"
    }

    if (-not (Test-Path $sourceBin)) {
        throw "Binary not found at expected location: $sourceBin"
    }

    if (-not (Test-Path $ReleaseDir)) {
        New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
    }

    $destPath = Join-Path $ReleaseDir $outputFileName
    Copy-Item -Path $sourceBin -Destination $destPath -Force

    $info = Get-Item $destPath
    $sizeMb = [math]::Round($info.Length / 1MB, 2)
    $sizeKb = [math]::Round($info.Length / 1KB, 0)
    Write-Host "Output saved: $destPath" -ForegroundColor Green
    Write-Host "Binary size ($label): $sizeMb MB ($sizeKb KB)" -ForegroundColor Cyan
    return $destPath
}

function Show-InteractiveMenu {
    Write-Host "`nSelect an action:" -ForegroundColor Yellow
    Write-Host "  [1] Live Development (Hot Reload) [Default]" -ForegroundColor White
    Write-Host "  [2] Run Verification Checks (Vite + Cargo)" -ForegroundColor White
    Write-Host "  [3] Build Native Release -> $OutputDir/cathet.exe" -ForegroundColor White
    Write-Host "  [4] Build & Launch Native Release Immediately" -ForegroundColor White
    Write-Host "  [5] Build Windows x64 -> $OutputDir/cathet-x64.exe" -ForegroundColor White
    Write-Host "  [6] Build Windows ARM64 -> $OutputDir/cathet-arm64.exe" -ForegroundColor White
    Write-Host "  [7] Build All Targets (x64 + ARM64)" -ForegroundColor White
    Write-Host "  [8] Bump Project Version" -ForegroundColor White
    Write-Host "  [Q] Exit" -ForegroundColor DarkGray
    Write-Host ""
    $c = (Read-Host "Enter option [1-8, Q] (Default: 1)").Trim()
    if (-not $c) { return "1" }
    return $c
}

# --- Main Entry Point ---
if ($Help) { Show-HelpGuide; exit 0 }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "               Cathet - Unified Build Pipeline              " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Stop-ActiveProcesses
Ensure-Environment

# If executed without parameters, display the interactive pickable menu
if ($PSBoundParameters.Count -eq 0) {
    $selection = Show-InteractiveMenu
    switch ($selection) {
        "1" { $Dev = $true }
        "2" { $Check = $true }
        "3" { $Build = $true }
        "4" { $Build = $true; $Run = $true }
        "5" { $BuildX64 = $true }
        "6" { $BuildArm64 = $true }
        "7" { $All = $true }
        "8" {
            Write-Host "`nSelect version bump type:" -ForegroundColor Yellow
            Write-Host "  [1] Patch (e.g. 1.0.0 -> 1.0.1) [Default]"
            Write-Host "  [2] Minor (e.g. 1.0.0 -> 1.1.0)"
            Write-Host "  [3] Major (e.g. 1.0.0 -> 2.0.0)"
            Write-Host "  [4] Custom Version String"
            $bChoice = (Read-Host "Pick bump type [1-4] (Default: 1)").Trim()
            if ($bChoice -eq "2") { $Minor = $true }
            elseif ($bChoice -eq "3") { $Major = $true }
            elseif ($bChoice -eq "4") { $TargetVersion = Read-Host "Enter target SemVer" }
            else { $Patch = $true }
        }
        default { Write-Host "Exited." -ForegroundColor Gray; exit 0 }
    }
}

# 1. Verification Check Mode
if ($Check) {
    Invoke-CheckMode
    exit 0
}

# 2. Version Bumping Mode
if ($TargetVersion -or $Patch -or $Minor -or $Major) {
    Invoke-VersionBump $TargetVersion $Patch $Minor $Major
    exit 0
}

# 3. Compilation Modes
$compiledBin = $null
if ($All) {
    Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet-x64.exe" | Out-Null
    $compiledBin = Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet.exe"
    Compile-Target "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-arm64.exe" | Out-Null
    Write-Host "`nAll release targets compiled successfully into '$OutputDir/'!" -ForegroundColor Green
} elseif ($BuildArm64) {
    $compiledBin = Compile-Target "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-arm64.exe"
} elseif ($BuildX64) {
    Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet-x64.exe" | Out-Null
    $compiledBin = Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet.exe"
} elseif ($Build) {
    $compiledBin = Compile-Target "" "Native Release" "cathet.exe"
}

if ($compiledBin) {
    if ($Run) {
        Write-Host "Launching compiled binary: $compiledBin" -ForegroundColor Cyan
        Start-Process -FilePath $compiledBin
    }
    exit 0
}

# 4. Live Development Mode
if ($Dev -or $Live) {
    Write-Host "Launching Cathet in live development mode (Hot Reload)..." -ForegroundColor Yellow
    Write-Host " -> Press Ctrl+C in terminal to stop dev server." -ForegroundColor Gray
    Write-Host ""
    npx tauri dev
}
