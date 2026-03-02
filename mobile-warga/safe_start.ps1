# Create a local home directory to completely isolate the process from C:\Users\Administrator
$localHome = "$PSScriptRoot\.local-home"
if (!(Test-Path $localHome)) { New-Item -ItemType Directory -Path $localHome | Out-Null }

# Spoof the user home directory
# This forces all tools (Expo, Metro, etc.) to write their config/cache to this local folder
# instead of the restricted C:\Users\Administrator
$env:USERPROFILE = $localHome
# Also update APPDATA and LOCALAPPDATA as some tools use these
$env:APPDATA = "$localHome\AppData\Roaming"
$env:LOCALAPPDATA = "$localHome\AppData\Local"

# Ensure AppData folders exist
if (!(Test-Path $env:APPDATA)) { New-Item -ItemType Directory -Path $env:APPDATA -Force | Out-Null }
if (!(Test-Path $env:LOCALAPPDATA)) { New-Item -ItemType Directory -Path $env:LOCALAPPDATA -Force | Out-Null }

Write-Host "Starting Expo with SPOOFED HOME directory..."
Write-Host "USERPROFILE: $env:USERPROFILE"

# Run Expo
& ".\node_modules\.bin\expo.cmd" start --clear --port 8082
