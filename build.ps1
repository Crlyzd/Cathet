<#
.SYNOPSIS
    build.ps1 - Cathet Unified Automation Pipeline (Interactive CLI, Dev, Build, Check, Bump)
#>

param(
    [switch]$Dev, [switch]$Live, [switch]$Check, [switch]$Build,
    [switch]$BuildX64, [switch]$BuildArm64, [switch]$All, [switch]$Run,
    [switch]$Patch, [switch]$Minor, [switch]$Major,
    [string]$TargetVersion, [string]$OutputDir = "release",
    [int]$Port = 0, [switch]$NoPause, [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot
$ReleaseDir = Join-Path $ProjectRoot $OutputDir

function Invoke-Exit([int]$code = 0) {
    if (-not $NoPause) {
        Write-Host ""
        [void](Read-Host "Press Enter to exit...")
    }
    exit $code
}

function Show-HelpGuide {
    Write-Host "Cathet Unified Automation Script" -ForegroundColor Cyan
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\build.ps1                        -> Interactive CLI menu"
    Write-Host "  .\build.ps1 -Dev / -Live           -> Launch live dev mode (hot reload)"
    Write-Host "  .\build.ps1 -Check                 -> Run TypeScript build & Cargo check"
    Write-Host "  .\build.ps1 -Build [-Run]          -> Build release binary & save to '$OutputDir/'"
    Write-Host "  .\build.ps1 -BuildX64 / -BuildArm64-> Build target-specific release binary"
    Write-Host "  .\build.ps1 -All                   -> Build both x64 and ARM64 binaries"
    Write-Host "  .\build.ps1 -Patch|-Minor|-Major   -> Bump version across all manifests"
    Write-Host "  .\build.ps1 -TargetVersion 1.2.3   -> Explicit version bump"
    Write-Host "  .\build.ps1 -NoPause               -> Non-interactive exit (for CI/CD)"
}

function Ensure-Environment {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not installed or not in PATH." }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is not installed or not in PATH." }
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw "Rust (cargo) is not installed or not in PATH." }
    $nodeModules = Join-Path $ProjectRoot "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
}

function Get-FreePort([int]$startPort = 5173) {
    for ($p = $startPort; $p -lt ($startPort + 100); $p++) {
        try {
            $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $l.Start()
            $l.Stop()
            return $p
        } catch { continue }
    }
    return $startPort
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
    Write-Host "`nAll checks passed successfully!" -ForegroundColor Green
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
    Write-Host "`n>>> Compiling smallest release for $label ($targetTriple)..." -ForegroundColor Yellow
    npm run build

    $manifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
    if ($targetTriple) {
        cargo build --release --target $targetTriple --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\$targetTriple\release\cathet.exe"
    } else {
        cargo build --release --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\release\cathet.exe"
    }

    if (-not (Test-Path $sourceBin)) { throw "Binary not found at expected location: $sourceBin" }

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

function Execute-Pipeline([hashtable]$opts) {
    if ($opts.Check) { Invoke-CheckMode; return }
    if ($opts.TargetVersion -or $opts.Patch -or $opts.Minor -or $opts.Major) {
        Invoke-VersionBump $opts.TargetVersion $opts.Patch $opts.Minor $opts.Major
        return
    }

    $compiledBin = $null
    if ($opts.All) {
        Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet-x64.exe" | Out-Null
        $compiledBin = Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet.exe"
        Compile-Target "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-arm64.exe" | Out-Null
        Write-Host "`nAll release targets compiled successfully into '$OutputDir/'!" -ForegroundColor Green
    } elseif ($opts.BuildArm64) {
        $compiledBin = Compile-Target "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-arm64.exe"
    } elseif ($opts.BuildX64) {
        Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet-x64.exe" | Out-Null
        $compiledBin = Compile-Target "x86_64-pc-windows-msvc" "Windows x64" "cathet.exe"
    } elseif ($opts.Build) {
        $compiledBin = Compile-Target "" "Native Release" "cathet.exe"
    }

    if ($compiledBin -and $opts.Run) {
        Write-Host "Launching compiled binary: $compiledBin" -ForegroundColor Cyan
        Start-Process -FilePath $compiledBin
    }

    if ($opts.Dev -or $opts.Live) {
        $p = if ($opts.Port -gt 0) { $opts.Port } else { Get-FreePort 5173 }
        $env:PORT = "$p"
        $env:VITE_PORT = "$p"
        Write-Host "`nAllocated dynamic dev port: $p" -ForegroundColor Cyan
        Write-Host "Launching Cathet in live dev mode (Hot Reload)..." -ForegroundColor Yellow
        Write-Host " -> Press Ctrl+C to stop dev server." -ForegroundColor Gray
        $cfg = Join-Path $env:TEMP "cathet-dev-$p.json"
        try {
            @{ build = @{ devUrl = "http://127.0.0.1:$p" } } | ConvertTo-Json | Set-Content $cfg
            npx tauri dev -c $cfg
        } finally {
            Remove-Item $cfg -Force -ErrorAction SilentlyContinue
        }
    }
}

# --- Main Entry Point ---
try {
    if ($Help) { Show-HelpGuide; Invoke-Exit 0 }

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "               Cathet - Unified Build Pipeline              " -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    Stop-ActiveProcesses
    Ensure-Environment

    $isInteractive = ($PSBoundParameters.Count -eq 0) -or ($PSBoundParameters.Count -eq 1 -and $PSBoundParameters.ContainsKey("NoPause"))

    if ($isInteractive) {
        while ($true) {
            $selection = Show-InteractiveMenu
            $runOpts = @{ Port = $Port }
            switch ($selection) {
                "1" { $runOpts.Dev = $true }
                "2" { $runOpts.Check = $true }
                "3" { $runOpts.Build = $true }
                "4" { $runOpts.Build = $true; $runOpts.Run = $true }
                "5" { $runOpts.BuildX64 = $true }
                "6" { $runOpts.BuildArm64 = $true }
                "7" { $runOpts.All = $true }
                "8" {
                    Write-Host "`nSelect bump type: [1] Patch [2] Minor [3] Major [4] Custom" -ForegroundColor Yellow
                    $bChoice = (Read-Host "Pick bump type [1-4] (Default: 1)").Trim()
                    if ($bChoice -eq "2") { $runOpts.Minor = $true }
                    elseif ($bChoice -eq "3") { $runOpts.Major = $true }
                    elseif ($bChoice -eq "4") { $runOpts.TargetVersion = Read-Host "Enter target SemVer" }
                    else { $runOpts.Patch = $true }
                }
                default { Write-Host "Exited." -ForegroundColor Gray; Invoke-Exit 0 }
            }
            Execute-Pipeline $runOpts
            $ans = (Read-Host "`nPress Enter to return to menu (or 'q' to exit)").Trim()
            if ($ans -eq "q" -or $ans -eq "Q") { Invoke-Exit 0 }
        }
    } else {
        Execute-Pipeline @{
            Dev = $Dev; Live = $Live; Check = $Check; Build = $Build
            BuildX64 = $BuildX64; BuildArm64 = $BuildArm64; All = $All; Run = $Run
            Patch = $Patch; Minor = $Minor; Major = $Major; TargetVersion = $TargetVersion
            Port = $Port
        }
        Invoke-Exit 0
    }
} catch {
    Write-Host "`n[BUILD ERROR] $_" -ForegroundColor Red
    Invoke-Exit 1
}
