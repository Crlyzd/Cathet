<#
.SYNOPSIS
    bump-version.ps1 - Easily bump Cathet version across all manifest files.

.EXAMPLE
    .\bump-version.ps1 -Patch         # 1.0.0 -> 1.0.1
    .\bump-version.ps1 -Minor         # 1.0.0 -> 1.1.0
    .\bump-version.ps1 -Major         # 1.0.0 -> 2.0.0
    .\bump-version.ps1 1.2.3          # Explicit target version
#>

param(
    [Parameter(Position = 0)]
    [string]$TargetVersion,
    [switch]$Patch,
    [switch]$Minor,
    [switch]$Major
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

$pkgPath = Join-Path $Root "package.json"
$tauriPath = Join-Path $Root "src-tauri\tauri.conf.json"
$cargoPath = Join-Path $Root "src-tauri\Cargo.toml"

# Read current version from package.json
$pkgJson = Get-Content -Raw $pkgPath | ConvertFrom-Json
$currentVer = $pkgJson.version
Write-Host "Current Cathet version: $currentVer" -ForegroundColor Cyan

# Determine new version
$newVer = $null

if ($TargetVersion) {
    $newVer = $TargetVersion
} elseif ($Patch -or $Minor -or $Major) {
    $parts = $currentVer.Split('.')
    $majorNum = [int]$parts[0]
    $minorNum = [int]$parts[1]
    $patchNum = [int]$parts[2]

    if ($Major) {
        $majorNum++
        $minorNum = 0
        $patchNum = 0
    } elseif ($Minor) {
        $minorNum++
        $patchNum = 0
    } elseif ($Patch) {
        $patchNum++
    }
    $newVer = "$majorNum.$minorNum.$patchNum"
} else {
    Write-Host "Usage: .\bump-version.ps1 [-Patch | -Minor | -Major | <Version>]" -ForegroundColor Yellow
    exit 1
}

Write-Host "Bumping version to: $newVer" -ForegroundColor Green

# 1. Update package.json
$pkgContent = Get-Content -Raw $pkgPath
$pkgContent = $pkgContent -replace '"version":\s*"[^"]+"', """version"": ""$newVer"""
Set-Content -Path $pkgPath -Value $pkgContent -NoNewline

# 2. Update tauri.conf.json
$tauriContent = Get-Content -Raw $tauriPath
$tauriContent = $tauriContent -replace '"version":\s*"[^"]+"', """version"": ""$newVer"""
Set-Content -Path $tauriPath -Value $tauriContent -NoNewline

# 3. Update Cargo.toml (only the package version line)
$cargoContent = Get-Content -Raw $cargoPath
$cargoContent = $cargoContent -replace '(?m)^version\s*=\s*"[^"]+"', "version = ""$newVer"""
Set-Content -Path $cargoPath -Value $cargoContent -NoNewline

# 4. Synchronize Cargo.lock
Write-Host "Synchronizing Cargo.lock..." -ForegroundColor Gray
cargo check --manifest-path "$cargoPath" --quiet

Write-Host "Version successfully bumped from $currentVer -> $newVer across all configurations!" -ForegroundColor Green
