<#
.SYNOPSIS
    build.ps1 - Cathet Unified Automation Pipeline (CLI, Dev, Build, Check, Bump, Android)
#>
param(
    [switch]$Dev, [switch]$Live, [switch]$Check, [switch]$Build, [switch]$BuildX64, [switch]$BuildArm64,
    [switch]$All, [switch]$Run, [switch]$AndroidDev, [switch]$AndroidBuild, [switch]$AndroidPerf, [switch]$Patch, [switch]$Minor,
    [switch]$Major, [string]$TargetVersion, [string]$OutputDir = "release", [int]$Port = 0, [switch]$NoPause, [switch]$Help
)

$ErrorActionPreference = "Stop"; $ProjectRoot = $PSScriptRoot; Set-Location $ProjectRoot
$ReleaseDir = Join-Path $ProjectRoot $OutputDir

function Invoke-Exit([int]$code = 0) {
    if (-not $NoPause) { Write-Host ""; [void](Read-Host "Press Enter to exit...") }
    exit $code
}
function Get-AppVersion { (Get-Content -Raw (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json).version }
function Get-NativeArch { if ($env:PROCESSOR_ARCHITECTURE -match "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -match "ARM64") { "arm64" } else { "x64" } }

function Show-HelpGuide {
    Write-Host "Cathet Unified Automation Script`nUsage:`n  .\build.ps1 -> Menu | -Dev / -Live -> Hot reload | -Check -> Tests | -Build [-Run] -> Fast EXE`n  -BuildX64 / -BuildArm64 -> Release EXE | -All -> Both | -AndroidDev / -AndroidBuild -> Android`n  -AndroidPerf -> Live Android Performance Monitor (RAM / CPU / 120Hz Jank)`n  -Patch|-Minor|-Major -> Bump version | -NoPause -> Non-interactive exit" -ForegroundColor Cyan
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

function Confirm-Target([string[]]$targets) {
    if (-not $targets) { return }
    $installed = @(rustup target list --installed)
    foreach ($t in $targets) {
        if ($t -and ($installed -notcontains $t)) {
            Write-Host "Adding missing Rust target: $t..." -ForegroundColor Yellow
            rustup target add $t
        }
    }
}

function Get-FreePort([int]$startPort = 5173) {
    for ($p = $startPort; $p -lt ($startPort + 100); $p++) {
        try {
            $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $l.Start(); $l.Stop(); return $p
        } catch { continue }
    }
    return $startPort
}

function Stop-ActiveProcesses {
    Get-Process | Where-Object { $_.ProcessName -like "cathet*" -or $_.ProcessName -eq "cleanpad" } | Stop-Process -Force -ErrorAction SilentlyContinue
    $conn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($conn) {
        $conn | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-CheckMode {
    Write-Host "[Check] Running frontend TypeScript & Vite build..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE." }
    Write-Host "[Check] Running backend Cargo check..." -ForegroundColor Yellow
    cargo check --manifest-path (Join-Path $ProjectRoot "src-tauri\Cargo.toml")
    if ($LASTEXITCODE -ne 0) { throw "Backend Cargo check failed with exit code $LASTEXITCODE." }
    Write-Host "`nAll checks passed successfully!" -ForegroundColor Green
}

function Invoke-VersionBump([string]$targetVer, [bool]$isPatch = $false, [bool]$isMinor = $false, [bool]$isMajor = $false) {
    $tauriPath = Join-Path $ProjectRoot "src-tauri\tauri.conf.json"
    $cargoPath = Join-Path $ProjectRoot "src-tauri\Cargo.toml"; $currentVer = Get-AppVersion
    Write-Host "Current Cathet version: $currentVer" -ForegroundColor Cyan

    $newVer = $targetVer
    if (-not $newVer) {
        $p = $currentVer.Split('.'); $maj = [int]$p[0]; $min = [int]$p[1]; $pat = [int]$p[2]
        if ($isMajor) { $maj++; $min = 0; $pat = 0 } elseif ($isMinor) { $min++; $pat = 0 } elseif ($isPatch) { $pat++ }
        $newVer = "$maj.$min.$pat"
    }
    if ($newVer -notmatch '^\d+\.\d+\.\d+') { throw "Invalid SemVer format: '$newVer'. Expected X.Y.Z" }
    Write-Host "Bumping version to: $newVer" -ForegroundColor Green

    npm version $newVer --no-git-tag-version --allow-same-version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm version bump failed." }
    (Get-Content -Raw $tauriPath) -replace '"version":\s*"[^"]+"', """version"": ""$newVer""" | Set-Content $tauriPath -NoNewline
    (Get-Content -Raw $cargoPath) -replace '(?m)^version\s*=\s*"[^"]+"', "version = ""$newVer""" | Set-Content $cargoPath -NoNewline

    Write-Host "Synchronizing Cargo.lock..." -ForegroundColor Gray
    cargo check --manifest-path $cargoPath --quiet
    if ($LASTEXITCODE -ne 0) { throw "Cargo lock synchronization failed." }
    Write-Host "Version bumped successfully: $currentVer -> $newVer" -ForegroundColor Green
}

function Invoke-CompileTarget([string]$targetTriple, [string]$label, [string]$versionedFileName, [string]$cargoProfile = "release") {
    Stop-ActiveProcesses; if ($targetTriple) { Confirm-Target $targetTriple }
    Write-Host "`n>>> Compiling ($cargoProfile) for $label ($targetTriple)..." -ForegroundColor Yellow
    npm run build | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE." }

    $manifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
    $sourceBin = if ($targetTriple) { Join-Path $ProjectRoot "src-tauri\target\$targetTriple\$cargoProfile\cathet.exe" }
                 else { Join-Path $ProjectRoot "src-tauri\target\$cargoProfile\cathet.exe" }
    Remove-Item -Path $sourceBin -Force -ErrorAction SilentlyContinue

    if ($targetTriple) { cargo build --profile $cargoProfile --target $targetTriple --manifest-path $manifest }
    else { cargo build --profile $cargoProfile --manifest-path $manifest }
    if ($LASTEXITCODE -ne 0) { throw "Cargo $cargoProfile build failed with exit code $LASTEXITCODE." }
    if (-not (Test-Path $sourceBin)) { throw "Binary not found at: $sourceBin" }
    if (-not (Test-Path $ReleaseDir)) { New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null }

    $destPath = Join-Path $ReleaseDir $versionedFileName
    Copy-Item -Path $sourceBin -Destination $destPath -Force
    $sizeMb = [math]::Round((Get-Item $destPath).Length / 1MB, 2)
    Write-Host "Output saved: $destPath ($sizeMb MB)" -ForegroundColor Green; return $destPath
}

function Resolve-CompatibleJavaHome {
    $candidates = @()
    if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) { $candidates += $env:JAVA_HOME }
    $roots = @((Join-Path $env:USERPROFILE ".jdks"), "C:\Program Files\Eclipse Adoptium", "C:\Program Files\Microsoft", "C:\Program Files\Java")
    foreach ($r in $roots) {
        if (Test-Path $r) {
            Get-ChildItem -Path $r -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match "jdk[-_]?(17|21)" } |
                ForEach-Object { $candidates += $_.FullName }
        }
    }
    foreach ($c in $candidates) {
        $jExe = Join-Path $c "bin\java.exe"
        if (Test-Path $jExe) {
            $v = (cmd.exe /c "`"$jExe`" -version 2>&1") -join "`n"
            if ($v -match '(17|21)\.') {
                $env:JAVA_HOME = $c; $env:PATH = "$c\bin;$env:PATH"
                $jVer = $Matches[1]
                Write-Host "Using Java runtime ($jVer): $c" -ForegroundColor Green; return
            }
        }
    }
    throw "Compatible JDK (17 or 21 LTS) required. Java 25 triggers error 69. Run: winget install Microsoft.OpenJDK.21"
}

function Initialize-AndroidEnvironment {
    Resolve-CompatibleJavaHome
    $sdk = if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { $env:ANDROID_HOME }
    elseif ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) { $env:ANDROID_SDK_ROOT }
    elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { "$env:LOCALAPPDATA\Android\Sdk" } else { $null }
    if (-not $sdk) {
        Write-Host "`n[Android SDK] Headless Android SDK is not yet installed." -ForegroundColor Yellow
        $c = (Read-Host "Install minimal headless Android SDK (~1.2 GB)? [Y/n] (Default: Y)").Trim()
        if ($c -eq "n" -or $c -eq "N") { throw "Android SDK required. Run again and accept [Y] or install manually." }
        Install-MinimalAndroidSdk | Out-Null; $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    }
    $sdk = [string]$sdk; $env:ANDROID_HOME = $sdk; $env:ANDROID_SDK_ROOT = $sdk
    foreach ($sub in "platform-tools", "emulator", "cmdline-tools\latest\bin") {
        $p = Join-Path $sdk $sub; if ((Test-Path $p) -and ($env:PATH -notmatch [regex]::Escape($p))) { $env:PATH = "$p;$env:PATH" }
    }
    if (-not $env:NDK_HOME) {
        $ndkRoot = Join-Path $sdk "ndk"
        if (Test-Path $ndkRoot) {
            $latest = Get-ChildItem -Path $ndkRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
            if ($latest) { $env:NDK_HOME = $latest.FullName }
        }
    }
    $androidGen = Join-Path $ProjectRoot "src-tauri\gen\android"
    if (-not (Test-Path $androidGen)) {
        Write-Host "Initializing Android project wrapper via Tauri..." -ForegroundColor Yellow
        npx tauri android init; if ($LASTEXITCODE -ne 0) { throw "Tauri android init failed." }
    }
    $lp = Join-Path $androidGen "local.properties"
    if (-not (Test-Path $lp)) {
        Set-Content -Path $lp -Value "sdk.dir=$($sdk.Replace('\', '/'))"
    }
    $gp = Join-Path $androidGen "gradle.properties"
    if ((Test-Path $gp) -and ((Get-Content $gp -Raw) -notmatch 'kotlin\.incremental')) {
        Add-Content -Path $gp -Value "`nkotlin.incremental=false`nandroid.javaCompile.suppressSourceTargetDeprecationWarning=true"
    }
    $manifest = Join-Path $androidGen "app\src\main\AndroidManifest.xml"
    if ((Test-Path $manifest) -and ((Get-Content $manifest -Raw) -notmatch 'roundIcon')) {
        (Get-Content $manifest -Raw) -replace 'android:icon="@mipmap/ic_launcher"', "android:icon=`"@mipmap/ic_launcher`"`n        android:roundIcon=`"@mipmap/ic_launcher_round`"" | Set-Content $manifest -NoNewline
    }
    $androidRes = Join-Path $androidGen "app\src\main\res"
    $roundXml = Join-Path $androidRes "mipmap-anydpi-v26\ic_launcher_round.xml"
    if (-not (Test-Path $roundXml)) {
        npx tauri icon (Join-Path $ProjectRoot "public\app-icon.png")
        New-Item -ItemType Directory -Path (Join-Path $androidRes "mipmap-anydpi-v26") -Force | Out-Null
        Set-Content -Path $roundXml -Value "<?xml version=`"1.0`" encoding=`"utf-8`"?>`n<adaptive-icon xmlns:android=`"http://schemas.android.com/apk/res/android`">`n  <foreground android:drawable=`"@mipmap/ic_launcher_foreground`"/>`n  <background android:drawable=`"@color/ic_launcher_background`"/>`n</adaptive-icon>"
        Remove-Item (Join-Path $androidRes "drawable\ic_launcher_background.xml"), (Join-Path $androidRes "drawable-v24\ic_launcher_foreground.xml") -Force -ErrorAction SilentlyContinue
    }
    $keystore = Join-Path $androidGen "app\cathet-release.jks"
    if (-not (Test-Path $keystore)) {
        Write-Host "Ensuring Android release signing keystore..." -ForegroundColor Yellow
        $keytoolCmd = if (Get-Command keytool.exe -ErrorAction SilentlyContinue) { "keytool.exe" } elseif ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\keytool.exe" } else { $null }
        if ($keytoolCmd) {
            cmd.exe /c "`"$keytoolCmd`" -genkeypair -v -keystore `"$keystore`" -alias cathet -keyalg RSA -keysize 2048 -validity 10000 -storepass cathetpass -keypass cathetpass -dname `"CN=Cathet, OU=App, O=Cathet, C=US`"" 2>$null | Out-Null
        }
    }
    $proguard = Join-Path $androidGen "app\proguard-rules.pro"
    if ((Test-Path $proguard) -and ((Get-Content $proguard -Raw) -notmatch 'com\.cathet\.app\.MainActivity')) {
        Add-Content -Path $proguard -Value "`n-keepclassmembers class com.cathet.app.MainActivity {`n    native <methods>;`n}`n`n-keep class com.cathet.app.FileHelper {`n    public static *;`n}"
    }
}

function Install-MinimalAndroidSdk {
    $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"; $latestDir = Join-Path $sdk "cmdline-tools\latest"
    Write-Host "`n>>> Setting up Minimal Headless Android SDK (~1.2 GB) in: $sdk" -ForegroundColor Cyan
    $tZip = Join-Path $env:TEMP "cathet-cmdline-tools.zip"; $tExt = Join-Path $env:TEMP "cathet-cmdline-tools-ext"
    Remove-Item $tZip, $tExt -Recurse -Force -ErrorAction SilentlyContinue
    $cliUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) { curl.exe -L --progress-bar $cliUrl -o $tZip }
    else { $prev = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $cliUrl -OutFile $tZip; $ProgressPreference = $prev }
    Expand-Archive -Path $tZip -DestinationPath $tExt -Force
    if (Test-Path $latestDir) { Remove-Item $latestDir -Recurse -Force }
    New-Item -ItemType Directory -Path (Join-Path $sdk "cmdline-tools") -Force | Out-Null
    Move-Item -Path (Join-Path $tExt "cmdline-tools") -Destination $latestDir -Force; Remove-Item $tZip, $tExt -Recurse -Force -ErrorAction SilentlyContinue
    $sdkMgr = Join-Path $latestDir "bin\sdkmanager.bat"
    cmd.exe /c "(for /l %i in (1,1,25) do @echo y) | `"$sdkMgr`" --sdk_root=`"$sdk`" --licenses" 2>$null | Out-Null
    cmd.exe /c "(for /l %i in (1,1,25) do @echo y) | `"$sdkMgr`" --sdk_root=`"$sdk`" `"platform-tools`" `"platforms;android-34`" `"build-tools;34.0.0`" `"ndk;26.3.11579264`"" | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Android SDK package installation failed with exit code $LASTEXITCODE." }
    Write-Host "Minimal Android SDK setup completed successfully!" -ForegroundColor Green; return $sdk
}

function Invoke-AndroidDev {
    Initialize-AndroidEnvironment; Confirm-Target @("x86_64-linux-android", "aarch64-linux-android")
    $targetDevId = $null
    if (Get-Command adb -ErrorAction SilentlyContinue) {
        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
        try {
            while ($true) {
                $raw = @(cmd.exe /c "adb devices 2>nul" | Where-Object { $_ -match '\t(device|emulator|unauthorized)' })
                if (@($raw | Where-Object { $_ -match '\tunauthorized' }).Count -gt 0) {
                    Write-Host "`n[ALERT] Device connected but UNAUTHORIZED! Unlock phone and tap Allow." -ForegroundColor Yellow
                    $ans = (Read-Host "Press Enter once allowed (or 'q' to skip)").Trim(); if ($ans -in "q", "Q") { break } else { continue }
                }
                $ready = @($raw | Where-Object { $_ -match '\t(device|emulator)' })
                if ($ready.Count -gt 1) {
                    Write-Host "`nMultiple active Android targets found:" -ForegroundColor Cyan
                    for ($i = 0; $i -lt $ready.Count; $i++) {
                        $did = $ready[$i].Split("`t")[0]
                        $m = ("" + (cmd.exe /c "adb -s $did shell getprop ro.product.model 2>nul")).Trim()
                        Write-Host "  [$($i+1)] $did ($m)"
                    }
                    $sel = (Read-Host "Select target [1-$($ready.Count)] (Default: 1)").Trim()
                    $idx = if ($sel -match '^\d+$' -and [int]$sel -ge 1 -and [int]$sel -le $ready.Count) { [int]$sel - 1 } else { 0 }
                    $targetDevId = $ready[$idx].Split("`t")[0]
                } elseif ($ready.Count -eq 1) {
                    $targetDevId = $ready[0].Split("`t")[0]
                } elseif (Get-Command emulator -ErrorAction SilentlyContinue) {
                    $avds = @(cmd.exe /c "emulator -list-avds 2>nul")
                    if ($avds.Count -gt 0) {
                        $avd = $avds[0]; Write-Host "Starting Android emulator '$avd' with host GPU..." -ForegroundColor Yellow
                        $lockDir = Join-Path $env:USERPROFILE ".android\avd\$avd.avd"
                        Remove-Item (Join-Path $lockDir "*.lock") -Recurse -Force -ErrorAction SilentlyContinue
                        Start-Process "emulator" -ArgumentList "-avd", "$avd", "-gpu", "host"
                        Write-Host "Waiting for emulator to complete boot..." -ForegroundColor Yellow
                        cmd.exe /c "adb wait-for-device 2>nul" | Out-Null
                        for ($w = 0; $w -lt 60; $w++) {
                            Start-Sleep -Seconds 2
                            $b = ("" + (cmd.exe /c "adb shell getprop sys.boot_completed 2>nul")).Trim()
                            if ($b -eq "1") { break }
                        }
                        $readyEmu = @(cmd.exe /c "adb devices 2>nul" | Where-Object { $_ -match '\tdevice' })
                        if ($readyEmu.Count -gt 0) { $targetDevId = $readyEmu[0].Split("`t")[0] }
                    } else { Write-Host "[Note] Connect phone via USB or create an AVD with avdmanager." -ForegroundColor Yellow }
                }
                break
            }
        } finally {
            $ErrorActionPreference = $prevEAP
        }
    }
    if (-not $targetDevId) { throw "No active Android device or emulator available." }
    $m = ("" + (cmd.exe /c "adb -s $targetDevId shell getprop ro.product.model 2>nul")).Trim()
    $devName = if ($m) { "$m ($targetDevId)" } else { $targetDevId }
    $abi = ("" + (cmd.exe /c "adb -s $targetDevId shell getprop ro.product.cpu.abi 2>nul")).Trim()
    $arch = if ($abi -match "x86_64") { "x86_64" } elseif ($abi -match "arm64|aarch64") { "aarch64" } else { "armv7" }
    $rustTarget = if ($arch -eq "x86_64") { "x86_64-linux-android" } elseif ($arch -eq "aarch64") { "aarch64-linux-android" } else { "armv7-linux-androideabi" }
    Confirm-Target @($rustTarget)

    cmd.exe /c "adb -s $targetDevId wait-for-device 2>nul" | Out-Null
    cmd.exe /c "adb -s $targetDevId reverse tcp:5173 tcp:5173 2>nul" | Out-Null

    # Pre-flight signature collision check: detect release installation on target device
    $isInstalled = ("" + (cmd.exe /c "adb -s $targetDevId shell pm list packages com.cathet.app 2>nul")).Trim()
    if ($isInstalled -match "com\.cathet\.app") {
        $pkgDump = ("" + (cmd.exe /c "adb -s $targetDevId shell dumpsys package com.cathet.app 2>nul"))
        if ($pkgDump -and ($pkgDump -notmatch "DEBUGGABLE")) {
            Write-Host "`n[ALERT] Device has release-signed Cathet installed (incompatible with Debug Live Dev)." -ForegroundColor Yellow
            $clean = (Read-Host "Uninstall old release APK to allow Live Dev? [Y/n] (Default: y)").Trim()
            if ($clean -notin "n", "N") {
                cmd.exe /c "adb -s $targetDevId uninstall com.cathet.app 2>nul" | Out-Null
                Write-Host "Uninstalled old conflicting release package." -ForegroundColor Green
            }
        }
    }

    Write-Host "`n>>> Starting Cathet Android Live Dev (Hot Reload) on $devName..." -ForegroundColor Cyan

    # If multiple devices connected, specify target; otherwise let Tauri CLI auto-detect the single active device
    $allReady = @(cmd.exe /c "adb devices 2>nul" | Where-Object { $_ -match '\t(device|emulator)' })
    if ($allReady.Count -gt 1) {
        $avdName = $null
        if ($targetDevId -like "emulator-*") {
            $avdRaw = ("" + (cmd.exe /c "adb -s $targetDevId emu avd name 2>nul")).Trim()
            if ($avdRaw) { $avdName = ($avdRaw -replace '(?i)\s*OK\s*$', '').Trim() }
        }
        $tauriDevTarget = if ($avdName) { $avdName } elseif ($m) { $m } else { $targetDevId }
        npx tauri android dev $tauriDevTarget
    } else {
        npx tauri android dev
    }
}

function Invoke-AndroidBuild {
    Initialize-AndroidEnvironment; $ver = Get-AppVersion
    Confirm-Target @("aarch64-linux-android", "armv7-linux-androideabi", "i686-linux-android", "x86_64-linux-android")
    Write-Host "`nCompiling Android Universal Release APK..." -ForegroundColor Cyan
    npx tauri android build --apk; if ($LASTEXITCODE -ne 0) { throw "Tauri android build failed with exit code $LASTEXITCODE." }
    $apkCandidate = (Get-ChildItem -Path (Join-Path $ProjectRoot "src-tauri\gen\android\app\build\outputs\apk") -Recurse -Filter "*release*.apk" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*unsigned*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1)
    $apkSrc = if ($apkCandidate) { $apkCandidate.FullName } else { Join-Path $ProjectRoot "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk" }
    if (-not (Test-Path $apkSrc)) {
        $apkSrc = Join-Path $ProjectRoot "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
    }
    if (Test-Path $apkSrc) {
        if (-not (Test-Path $ReleaseDir)) { New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null }
        $apkDest = Join-Path $ReleaseDir "cathet-v$ver-android.apk"
        Copy-Item -Path $apkSrc -Destination $apkDest -Force
        $sizeMb = [math]::Round((Get-Item $apkDest).Length / 1MB, 2)
        Write-Host "Android APK created: $apkDest ($sizeMb MB)" -ForegroundColor Green
        $devs = @(cmd.exe /c "adb devices 2>nul" | Where-Object { $_ -match '\tdevice' })
        if ($devs.Count -gt 0) {
            $did = $devs[0].Split("`t")[0]
            $c = (Read-Host "`nInstall release APK to connected USB device ($did)? [Y/n] (Default: n)").Trim()
            if ($c -in "y", "Y") {
                $installRes = cmd.exe /c "adb -s $did install -r `"$apkDest`" 2>&1"
                Write-Host $installRes
                if ($installRes -match "INSTALL_FAILED_UPDATE_INCOMPATIBLE") {
                    Write-Host "`n[ALERT] Signature mismatch with existing debug installation." -ForegroundColor Yellow
                    $reinstall = (Read-Host "Uninstall old version and install new release APK? [Y/n] (Default: y)").Trim()
                    if ($reinstall -notin "n", "N") {
                        cmd.exe /c "adb -s $did uninstall com.cathet.app 2>nul" | Out-Null
                        cmd.exe /c "adb -s $did install `"$apkDest`""
                    }
                }
                cmd.exe /c "adb -s $did shell am start -n com.cathet.app/com.cathet.app.MainActivity"
            }
        }
    }
}

function Invoke-AndroidPerf {
    Initialize-AndroidEnvironment
    $targetDevId = $null
    $prevEAP = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
    try {
        $raw = @(cmd.exe /c "adb devices 2>nul" | Where-Object { $_ -match '\t(device|emulator)' })
        if ($raw.Count -gt 1) {
            Write-Host "`nMultiple active Android targets found:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $raw.Count; $i++) {
                $did = $raw[$i].Split("`t")[0]
                $m = ("" + (cmd.exe /c "adb -s $did shell getprop ro.product.model 2>nul")).Trim()
                Write-Host "  [$($i+1)] $did ($m)"
            }
            $sel = (Read-Host "Select target [1-$($raw.Count)] (Default: 1)").Trim()
            $idx = if ($sel -match '^\d+$' -and [int]$sel -ge 1 -and [int]$sel -le $raw.Count) { [int]$sel - 1 } else { 0 }
            $targetDevId = $raw[$idx].Split("`t")[0]
        } elseif ($raw.Count -eq 1) {
            $targetDevId = $raw[0].Split("`t")[0]
        }
    } finally {
        $ErrorActionPreference = $prevEAP
    }
    if (-not $targetDevId) { throw "No active Android device or emulator available. Please connect your phone via USB or start an emulator." }
    $m = ("" + (cmd.exe /c "adb -s $targetDevId shell getprop ro.product.model 2>nul")).Trim()
    $devName = if ($m) { "$m ($targetDevId)" } else { $targetDevId }

    Write-Host "`nConnecting to Cathet on $devName..." -ForegroundColor Cyan

    # Ensure app is running or prompt to start
    $pidRaw = ("" + (cmd.exe /c "adb -s $targetDevId shell pidof com.cathet.app 2>nul")).Trim()
    if (-not $pidRaw) {
        Write-Host "Cathet is not running on device. Launching com.cathet.app..." -ForegroundColor Yellow
        cmd.exe /c "adb -s $targetDevId shell am start -n com.cathet.app/com.cathet.app.MainActivity 2>nul" | Out-Null
        Start-Sleep -Seconds 2
        $pidRaw = ("" + (cmd.exe /c "adb -s $targetDevId shell pidof com.cathet.app 2>nul")).Trim()
    }

    Write-Host "Monitoring Cathet PID: $pidRaw (Press [Q] to quit, [R] to reset frame stats, [C] to clear)...`n" -ForegroundColor Green
    Start-Sleep -Seconds 1

    try {
        while ($true) {
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true).Key
                if ($key -eq [ConsoleKey]::Q) { break }
                elseif ($key -eq [ConsoleKey]::R) {
                    cmd.exe /c "adb -s $targetDevId shell dumpsys gfxinfo com.cathet.app reset 2>nul" | Out-Null
                    Write-Host "`n>>> [Frame Jank Stats Reset] <<<" -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 600
                } elseif ($key -eq [ConsoleKey]::C) {
                    Clear-Host
                }
            }

            $currentPid = ("" + (cmd.exe /c "adb -s $targetDevId shell pidof com.cathet.app 2>nul")).Trim()
            if (-not $currentPid) {
                Write-Host "`r[WAITING] App is closed/backgrounded. Waiting for Cathet... (Press Q to quit)   " -NoNewline -ForegroundColor Gray
                Start-Sleep -Milliseconds 1200
                continue
            }

            # 1. Memory breakdown via dumpsys meminfo
            $memDump = ("" + (cmd.exe /c "adb -s $targetDevId shell dumpsys meminfo com.cathet.app 2>nul"))
            $totalPssMb = 0.0; $nativeHeapMb = 0.0; $graphicsMb = 0.0; $webviewMb = 0.0

            if ($memDump -match 'TOTAL PSS:\s*(\d+)') {
                $totalPssMb = [math]::Round(([double]$matches[1]) / 1024.0, 1)
            }
            if ($memDump -match 'Native Heap\s*(\d+)') {
                $nativeHeapMb = [math]::Round(([double]$matches[1]) / 1024.0, 1)
            }
            if ($memDump -match 'GfxDev\s*(\d+)' -or $memDump -match 'EGL mtrack\s*(\d+)' -or $memDump -match 'GL mtrack\s*(\d+)') {
                $graphicsMb = [math]::Round(([double]$matches[1]) / 1024.0, 1)
            }
            if ($memDump -match 'Webview\s*(\d+)' -or $memDump -match 'Code\s*(\d+)') {
                $webviewMb = [math]::Round(([double]$matches[1]) / 1024.0, 1)
            }

            # 2. CPU % via top
            $topDump = ("" + (cmd.exe /c "adb -s $targetDevId shell top -b -n 1 -p $currentPid 2>nul"))
            $cpuPct = "0.0"
            if ($topDump -match "(?m)^\s*$currentPid\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+([\d\.]+)") {
                $cpuPct = $matches[1]
            } elseif ($topDump -match '\b(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+com\.cathet\.app') {
                $cpuPct = $matches[2]
            }

            # 3. 120Hz frame timing and jank via dumpsys gfxinfo
            $gfxDump = ("" + (cmd.exe /c "adb -s $targetDevId shell dumpsys gfxinfo com.cathet.app 2>nul"))
            $totalFrames = "0"; $jankyFrames = "0"; $jankyPct = "0.00"
            $p50 = "--"; $p90 = "--"; $p95 = "--"; $p99 = "--"

            if ($gfxDump -match 'Total frames rendered:\s*(\d+)') { $totalFrames = $matches[1] }
            if ($gfxDump -match 'Janky frames:\s*(\d+)\s*\(([\d\.]+)\%\)') {
                $jankyFrames = $matches[1]; $jankyPct = $matches[2]
            }
            if ($gfxDump -match '50th percentile:\s*(\d+)ms') { $p50 = "$($matches[1]) ms" }
            if ($gfxDump -match '90th percentile:\s*(\d+)ms') { $p90 = "$($matches[1]) ms" }
            if ($gfxDump -match '95th percentile:\s*(\d+)ms') { $p95 = "$($matches[1]) ms" }
            if ($gfxDump -match '99th percentile:\s*(\d+)ms') { $p99 = "$($matches[1]) ms" }

            # Render fixed-position dashboard
            Clear-Host
            Write-Host "================ Cathet Android Task Manager ================" -ForegroundColor Cyan
            Write-Host " Device : $devName" -ForegroundColor Gray
            Write-Host " App PID: $currentPid    Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
            Write-Host "-------------------------------------------------------------" -ForegroundColor DarkGray

            Write-Host " [RAM Breakdown / Proportional Working Set]" -ForegroundColor Yellow
            $ramColor = if ($totalPssMb -lt 180) { "Green" } elseif ($totalPssMb -lt 280) { "Yellow" } else { "Red" }
            Write-Host "   Total PSS (RAM) : $totalPssMb MB" -ForegroundColor $ramColor
            Write-Host "   Native Heap     : $nativeHeapMb MB  (Rust Tokio & JNI Engine)" -ForegroundColor Gray
            if ($graphicsMb -gt 0) {
                Write-Host "   Graphics / EGL  : $graphicsMb MB  (GPU Surfaces & Buffers)" -ForegroundColor Gray
            }
            if ($webviewMb -gt 0) {
                Write-Host "   WebView / Code  : $webviewMb MB  (Chromium UI & Assets)" -ForegroundColor Gray
            }

            Write-Host "`n [CPU Utilization]" -ForegroundColor Yellow
            Write-Host "   App CPU Usage   : $cpuPct %" -ForegroundColor Cyan

            Write-Host "`n [120Hz Display & Frame Jank Timing (Budget: <= 8.33 ms)]" -ForegroundColor Yellow
            $jankColor = if ([double]$jankyPct -lt 2.0) { "Green" } elseif ([double]$jankyPct -lt 5.0) { "Yellow" } else { "Red" }
            Write-Host "   Total Frames    : $totalFrames" -ForegroundColor Gray
            Write-Host "   Janky Frames    : $jankyFrames ($jankyPct %)" -ForegroundColor $jankColor
            Write-Host "   50th Percentile : $p50" -ForegroundColor Gray
            Write-Host "   90th Percentile : $p90" -ForegroundColor Gray
            Write-Host "   95th Percentile : $p95" -ForegroundColor Gray
            Write-Host "   99th Percentile : $p99" -ForegroundColor Gray
            Write-Host "-------------------------------------------------------------" -ForegroundColor DarkGray
            Write-Host " Controls: [R] Reset Jank Stats | [C] Clear | [Q] Quit" -ForegroundColor DarkCyan

            Start-Sleep -Milliseconds 1200
        }
    } finally {
        Write-Host "`nClosed Android Performance Monitor." -ForegroundColor Gray
    }
}

function Show-InteractiveMenu {
    $ver = Get-AppVersion; $arch = Get-NativeArch
    Write-Host "`nSelect an action:`n  [1] Live Development (Desktop Hot Reload) [Default]`n  [2] Run Verification Checks (Vite + Cargo)`n  [3] Build Native ($arch) Fast Executable -> $OutputDir/cathet-v$ver-$arch-fast.exe`n  [4] Build & Launch Native ($arch) Fast Executable Immediately`n  [5] Build Windows x64 Release (Smallest) -> $OutputDir/cathet-v$ver-x64.exe`n  [6] Build Windows ARM64 Release (Smallest) -> $OutputDir/cathet-v$ver-arm64.exe`n  [7] Build All Windows Targets Release -> x64 and ARM64`n  [8] Android Live Dev (Hot Reload - USB Device / Emulator)`n  [9] Build Android Release APK -> $OutputDir/cathet-v$ver-android.apk`n  [10] Android Performance Monitor (Live RAM / CPU / 120Hz Jank)`n  [11] Bump Project Version (Current: v$ver)`n  [Q] Exit" -ForegroundColor Yellow
    $c = (Read-Host "Enter option [1-11, Q] (Default: 1)").Trim(); return $(if ($c) { $c } else { "1" })
}

function Invoke-Pipeline([hashtable]$opts) {
    if ($opts.Check) { Invoke-CheckMode; return }
    if ($opts.AndroidDev) { Invoke-AndroidDev; return }
    if ($opts.AndroidBuild) { Invoke-AndroidBuild; return }
    if ($opts.AndroidPerf) { Invoke-AndroidPerf; return }
    if ($opts.TargetVersion -or $opts.Patch -or $opts.Minor -or $opts.Major) {
        Invoke-VersionBump $opts.TargetVersion ([bool]$opts.Patch) ([bool]$opts.Minor) ([bool]$opts.Major); return
    }
    $ver = Get-AppVersion; $nativeArch = Get-NativeArch; $compiledBin = $null
    if ($opts.All) {
        Invoke-CompileTarget "x86_64-pc-windows-msvc" "Windows x64" "cathet-v$ver-x64.exe" "release"
        Invoke-CompileTarget "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-v$ver-arm64.exe" "release"
        $compiledBin = Join-Path $ReleaseDir "cathet-v$ver-$nativeArch.exe"
        Write-Host "`nAll release targets compiled successfully into '$OutputDir/'!" -ForegroundColor Green
    } elseif ($opts.BuildArm64) { $compiledBin = Invoke-CompileTarget "aarch64-pc-windows-msvc" "Windows ARM64" "cathet-v$ver-arm64.exe" "release"
    } elseif ($opts.BuildX64) { $compiledBin = Invoke-CompileTarget "x86_64-pc-windows-msvc" "Windows x64" "cathet-v$ver-x64.exe" "release"
    } elseif ($opts.Build) {
        $nativeTriple = if ($nativeArch -eq "arm64") { "aarch64-pc-windows-msvc" } else { "x86_64-pc-windows-msvc" }
        $compiledBin = Invoke-CompileTarget $nativeTriple "Windows $nativeArch" "cathet-v$ver-$nativeArch-fast.exe" "fast-release"
    }
    if ($compiledBin -and $opts.Run) { Write-Host "Launching: $compiledBin" -ForegroundColor Cyan; Start-Process -FilePath $compiledBin }
    if ($opts.Dev -or $opts.Live) {
        $p = if ($opts.Port -gt 0) { $opts.Port } else { Get-FreePort 5173 }
        $env:PORT = "$p"; $env:VITE_PORT = "$p"
        Write-Host "`nAllocated dev port: $p. Launching Cathet (Hot Reload)..." -ForegroundColor Yellow
        $cfg = Join-Path $env:TEMP "cathet-dev-$p.json"
        try {
            @{ build = @{ devUrl = "http://127.0.0.1:$p" } } | ConvertTo-Json | Set-Content $cfg
            npx tauri dev -c $cfg
        } finally { Remove-Item $cfg -Force -ErrorAction SilentlyContinue }
    }
}

# --- Main Entry Point ---
try {
    if ($Help) { Show-HelpGuide; Invoke-Exit 0 }
    Write-Host "=== Cathet - Unified Build Pipeline ===" -ForegroundColor Cyan
    Stop-ActiveProcesses; Initialize-Environment
    $isInteractive = ($PSBoundParameters.Count -eq 0) -or ($PSBoundParameters.Count -eq 1 -and $PSBoundParameters.ContainsKey("NoPause"))

    if ($isInteractive) {
        while ($true) {
            $sel = Show-InteractiveMenu; $runOpts = @{ Port = $Port }
            switch ($sel) {
                "1" { $runOpts.Dev = $true }; "2" { $runOpts.Check = $true }; "3" { $runOpts.Build = $true }
                "4" { $runOpts.Build = $true; $runOpts.Run = $true }; "5" { $runOpts.BuildX64 = $true }
                "6" { $runOpts.BuildArm64 = $true }; "7" { $runOpts.All = $true }; "8" { $runOpts.AndroidDev = $true }
                "9" { $runOpts.AndroidBuild = $true }; "10" { $runOpts.AndroidPerf = $true }
                "11" {
                    $bChoice = (Read-Host "`nBump type: [1] Patch [2] Minor [3] Major [4] Custom (Default: 1)").Trim()
                    if ($bChoice -eq "2") { $runOpts.Minor = $true } elseif ($bChoice -eq "3") { $runOpts.Major = $true }
                    elseif ($bChoice -eq "4") {
                        $v = (Read-Host "Enter target SemVer (e.g. 3.1.0)").Trim()
                        if ($v) { $runOpts.TargetVersion = $v } else { $runOpts.Patch = $true }
                    } else { $runOpts.Patch = $true }
                }
                { $_ -in "q","Q" } { Write-Host "Exited." -ForegroundColor Gray; Invoke-Exit 0 }
                default { Write-Host "Invalid option '$_'. Choose 1-11 or Q." -ForegroundColor Red; continue }
            }
            Invoke-Pipeline $runOpts
            $ans = (Read-Host "`nPress Enter to return to menu (or 'q' to exit)").Trim(); if ($ans -in "q", "Q") { Invoke-Exit 0 }
        }
    } else {
        Invoke-Pipeline @{ Dev = $Dev; Live = $Live; Check = $Check; Build = $Build; BuildX64 = $BuildX64; BuildArm64 = $BuildArm64; All = $All; Run = $Run; AndroidDev = $AndroidDev; AndroidBuild = $AndroidBuild; AndroidPerf = $AndroidPerf; Patch = $Patch; Minor = $Minor; Major = $Major; TargetVersion = $TargetVersion; Port = $Port }
        Invoke-Exit 0
    }
} catch {
    Write-Host "`n[BUILD ERROR] $_" -ForegroundColor Red; Invoke-Exit 1
}
