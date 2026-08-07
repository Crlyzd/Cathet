# build.ps1 - CleanPad Rust + Tauri Build Script
# Usage:
#   .\build.ps1        -> Production release build -> src-tauri\target\release\cleanpad.exe
#   .\build.ps1 -Check -> Fast cargo check & TypeScript verification

param(
    [switch]$Check
)

$ErrorActionPreference = "Stop"

if ($Check) {
    & "$PSScriptRoot\test.ps1" -Check
} else {
    & "$PSScriptRoot\test.ps1" -Build
}
