$env:XDG_CACHE_HOME = "$PSScriptRoot\.cache"
$env:EXPO_DATA_DIR = "$PSScriptRoot\.expo-data"
$env:EXPO_CACHE_DIR = "$PSScriptRoot\.cache"
$env:npm_config_cache = "$PSScriptRoot\.npm-cache"

Write-Host "Setting local cache directories:"
Write-Host "XDG_CACHE_HOME: $env:XDG_CACHE_HOME"
Write-Host "EXPO_DATA_DIR: $env:EXPO_DATA_DIR"

if (!(Test-Path "$PSScriptRoot\.cache")) { New-Item -ItemType Directory -Path "$PSScriptRoot\.cache" | Out-Null }
if (!(Test-Path "$PSScriptRoot\.expo-data")) { New-Item -ItemType Directory -Path "$PSScriptRoot\.expo-data" | Out-Null }
if (!(Test-Path "$PSScriptRoot\.npm-cache")) { New-Item -ItemType Directory -Path "$PSScriptRoot\.npm-cache" | Out-Null }

npx expo start --clear --port 8082
