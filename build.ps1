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
    if (-not $NoPause) { Write-Host ""; [void](Read-Host "Press Enter to exit...") }
    exit $code
}

function Get-AppVersion {
    return (Get-Content -Raw (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json).version
}

function Show-HelpGuide {
    $ver = Get-AppVersion
    Write-Host "Cathet Unified Automation Script`nUsage:`n  .\build.ps1                        -> Interactive CLI menu`n  .\build.ps1 -Dev / -Live           -> Launch live dev mode (hot reload)`n  .\build.ps1 -Check                 -> Run TypeScript build & Cargo check`n  .\build.ps1 -Build [-Run]          -> Build release binary (cathet-v$ver.exe) & save to '$OutputDir/'`n  .\build.ps1 -BuildX64 / -BuildArm64-> Build target-specific release binary`n  .\build.ps1 -All                   -> Build both x64 and ARM64 binaries`n  .\build.ps1 -Patch|-Minor|-Major   -> Bump version across all manifests`n  .\build.ps1 -TargetVersion 1.2.3   -> Explicit version bump`n  .\build.ps1 -NoPause               -> Non-interactive exit (for CI/CD)" -ForegroundColor Cyan
}

function Initialize-Environment {
    foreach ($cmd in "node", "npm", "cargo") {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd is not installed or not in PATH." }
    }
    if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
}

function Confirm-Target([string]$target) {
    if (-not $target) { return }
    $installed = rustup target list --installed
    if ($installed -notcontains $target) {
        Write-Host "Adding missing Rust target: $target..." -ForegroundColor Yellow
        rustup target add $target
    }
}

function Get-FreePort([int]$startPort = 5173) {
    for ($p = $startPort; $p -lt ($startPort + 100); $p++) {
        try {
            $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $l.Start(); $l.Stop()
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

function Invoke-VersionBump([string]$targetVer, [bool]$isPatch = $false, [bool]$isMinor = $false, [bool]$isMajor = $false) {
    $pkgPath = Join-Path $ProjectRoot "package.json"
    $pkgLockPath = Join-Path $ProjectRoot "package-lock.json"
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

    if ($newVer -notmatch '^\d+\.\d+\.\d+') { throw "Invalid SemVer format: '$newVer'. Expected X.Y.Z" }
    Write-Host "Bumping version to: $newVer" -ForegroundColor Green

    (Get-Content -Raw $pkgPath) -replace '"version":\s*"[^"]+"', """version"": ""$newVer""" | Set-Content $pkgPath -NoNewline
    if (Test-Path $pkgLockPath) {
        (Get-Content -Raw $pkgLockPath) -replace '(?m)^(\s*"version":\s*)"[^"]+"', "`$1""$newVer""" | Set-Content $pkgLockPath -NoNewline
    }
    (Get-Content -Raw $tauriPath) -replace '"version":\s*"[^"]+"', """version"": ""$newVer""" | Set-Content $tauriPath -NoNewline
    (Get-Content -Raw $cargoPath) -replace '(?m)^version\s*=\s*"[^"]+"', "version = ""$newVer""" | Set-Content $cargoPath -NoNewline

    Write-Host "Synchronizing Cargo.lock..." -ForegroundColor Gray
    cargo check --manifest-path $cargoPath --quiet
    Write-Host "Version bumped successfully: $currentVer -> $newVer" -ForegroundColor Green
}

function Invoke-CompileTarget([string]$targetTriple, [string]$label, [string]$versionedFileName, [string]$aliasFileName = "") {
    Stop-ActiveProcesses
    if ($targetTriple) { Confirm-Target $targetTriple }
    Write-Host "`n>>> Compiling release for $label ($targetTriple)..." -ForegroundColor Yellow
    npm run build | Out-Host

    $manifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
    if ($targetTriple) {
        cargo build --release --target $targetTriple --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\$targetTriple\release\cathet.exe"
    } else {
        cargo build --release --manifest-path $manifest
        $sourceBin = Join-Path $ProjectRoot "src-tauri\target\release\cathet.exe"
    }

    if (-not (Test-Path $sourceBin)) { throw "Binary not found at: $sourceBin" }
    if (-not (Test-Path $ReleaseDir)) { New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null }

    $destPath = Join-Path $ReleaseDir $versionedFileName
    Copy-Item -Path $sourceBin -Destination $destPath -Force
    $sizeMb = [math]::Round((Get-Item $destPath).Length / 1MB, 2)
    Write-Host "Output saved: $destPath ($sizeMb MB)" -ForegroundColor Green

    if ($aliasFileName) {
        $aliasPath = Join-Path $ReleaseDir $aliasFileName
        Copy-Item -Path $sourceBin -Destination $aliasPath -Force
        Write-Host "Companion alias saved: $aliasPath" -ForegroundColor Gray
    }
    return $destPath
}

function Show-InteractiveMenu {
    $ver = Get-AppVersion
    Write-Host @"
Select an action:
  [1] Live Development (Hot Reload) [Default]
  [2] Run Verification Checks (Vite + Cargo)
  [3] Build Native Release -> $OutputDir/cathet-v$ver.exe
  [4] Build & Launch Native Release Immediately
  [5] Build Windows x64    -> $OutputDir/cathet-v$ver-x64.exe
  [6] Build Windows ARM64  -> $OutputDir/cathet-v$ver-arm64.exe
  [7] Build All Targets (x64 + ARM64)
  [8] Bump Project Version (Current: v$ver)
  [Q] Exit
"@ -ForegroundColor Yellow
    $c = (Read-Host "Enter option [1-8, Q] (Default: 1)").Trim()
    return $(if ($c) { $c } else { "1" })
}

function Invoke-Pipeline([hashtable]$opts) {
    if ($opts.Check) { Invoke-CheckMode; return }
    if ($opts.TargetVersion -or $opts.Patch -or $opts.Minor -or $opts.Major) {
        Invoke-VersionBump $opts.TargetVersion ([bool]$opts.Patch) ([bool]$opts.Minor) ([bool]$opts.Major)
        return
    }

    $ver = Get-AppVersion
    $compiledBin = $null
    if ($opts.All) {
        Invoke-CompileTarget "x86_64-pc-windows-msvc" "Windows x64" "cathet-v$ver-x64.exe" "cathet-x64.exe"
        $compiledBin = Join-Path $ReleaseDir "cathet.exe"
        Copy-Item (Join-Path $ReleaseDir "cathet-x64.exe") $compiledBin -Force
        Invoke-CompileTarget "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-v$ver-arm64.exe" "cathet-arm64.exe"
        Write-Host "`nAll release targets compiled successfully into '$OutputDir/'!" -ForegroundColor Green
    } elseif ($opts.BuildArm64) {
        $compiledBin = Invoke-CompileTarget "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-v$ver-arm64.exe" "cathet-arm64.exe"
    } elseif ($opts.BuildX64) {
        $compiledBin = Invoke-CompileTarget "x86_64-pc-windows-msvc" "Windows x64" "cathet-v$ver-x64.exe" "cathet-x64.exe"
        Copy-Item (Join-Path $ReleaseDir "cathet-x64.exe") (Join-Path $ReleaseDir "cathet.exe") -Force
    } elseif ($opts.Build) {
        $compiledBin = Invoke-CompileTarget "" "Native Release" "cathet-v$ver.exe" "cathet.exe"
    }

    if ($compiledBin -and $opts.Run) {
        Write-Host "Launching: $compiledBin" -ForegroundColor Cyan
        Start-Process -FilePath $compiledBin
    }

    if ($opts.Dev -or $opts.Live) {
        $p = if ($opts.Port -gt 0) { $opts.Port } else { Get-FreePort 5173 }
        $env:PORT = "$p"; $env:VITE_PORT = "$p"
        Write-Host "`nAllocated dev port: $p. Launching Cathet (Hot Reload)..." -ForegroundColor Yellow
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
    Write-Host "=== Cathet - Unified Build Pipeline ===" -ForegroundColor Cyan
    Stop-ActiveProcesses
    Initialize-Environment

    $isInteractive = ($PSBoundParameters.Count -eq 0) -or ($PSBoundParameters.Count -eq 1 -and $PSBoundParameters.ContainsKey("NoPause"))

    if ($isInteractive) {
        while ($true) {
            $sel = Show-InteractiveMenu
            $runOpts = @{ Port = $Port }
            switch ($sel) {
                "1" { $runOpts.Dev = $true }
                "2" { $runOpts.Check = $true }
                "3" { $runOpts.Build = $true }
                "4" { $runOpts.Build = $true; $runOpts.Run = $true }
                "5" { $runOpts.BuildX64 = $true }
                "6" { $runOpts.BuildArm64 = $true }
                "7" { $runOpts.All = $true }
                "8" {
                    $bChoice = (Read-Host "`nBump type: [1] Patch [2] Minor [3] Major [4] Custom (Default: 1)").Trim()
                    if ($bChoice -eq "2") { $runOpts.Minor = $true }
                    elseif ($bChoice -eq "3") { $runOpts.Major = $true }
                    elseif ($bChoice -eq "4") {
                        $v = (Read-Host "Enter target SemVer (e.g. 3.1.0)").Trim()
                        if ($v) { $runOpts.TargetVersion = $v } else { $runOpts.Patch = $true }
                    } else { $runOpts.Patch = $true }
                }
                { $_ -in "q","Q" } { Write-Host "Exited." -ForegroundColor Gray; Invoke-Exit 0 }
                default { Write-Host "Invalid option '$_'. Choose 1-8 or Q." -ForegroundColor Red; continue }
            }
            Invoke-Pipeline $runOpts
            $ans = (Read-Host "`nPress Enter to return to menu (or 'q' to exit)").Trim()
            if ($ans -eq "q" -or $ans -eq "Q") { Invoke-Exit 0 }
        }
    } else {
        Invoke-Pipeline @{ Dev = $Dev; Live = $Live; Check = $Check; Build = $Build; BuildX64 = $BuildX64; BuildArm64 = $BuildArm64; All = $All; Run = $Run; Patch = $Patch; Minor = $Minor; Major = $Major; TargetVersion = $TargetVersion; Port = $Port }
        Invoke-Exit 0
    }
} catch {
    Write-Host "`n[BUILD ERROR] $_" -ForegroundColor Red
    Invoke-Exit 1
}
