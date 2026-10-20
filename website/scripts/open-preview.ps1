$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$previewUrl = 'http://127.0.0.1:4174/'
$serverScript = Join-Path $PSScriptRoot 'serve-static.mjs'
if (-not (Test-Path -LiteralPath (Join-Path $siteRoot 'dist/client/index.html'))) {
    throw 'Build is missing. Run npm run build in the website directory.'
}
function Test-Preview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
        return $response.Content.Contains('/assets/') -and $response.Content.Contains('hero-title')
    } catch { return $false }
}
if (-not (Test-Preview)) {
    $nodeCandidates = @()
    $installedNode = Get-Command node -ErrorAction SilentlyContinue
    if ($installedNode) { $nodeCandidates += $installedNode.Source }
    $npmCache = Join-Path $env:LOCALAPPDATA 'npm-cache/_npx'
    if (Test-Path -LiteralPath $npmCache) {
        foreach ($entry in Get-ChildItem -LiteralPath $npmCache -Directory) {
            $candidate = Join-Path $entry.FullName 'node_modules/node/bin/node.exe'
            if (Test-Path -LiteralPath $candidate) { $nodeCandidates += $candidate }
        }
    }
    $nodeExe = $null
    foreach ($candidate in $nodeCandidates) {
        $version = (& $candidate --version 2>$null)
        if ($version -match '^v(\d+)\.' -and [int]$Matches[1] -ge 22) {
            $nodeExe = $candidate
            break
        }
    }
    if (-not $nodeExe) { throw 'Node.js 22 or newer is required. Install it and try again.' }
    $logDir = Join-Path $siteRoot '.preview'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $serverProcess = Start-Process -FilePath $nodeExe -ArgumentList @("`"$serverScript`"", '--port', '4174') -WorkingDirectory $siteRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-Preview) { $ready = $true; break }
        if ($serverProcess.HasExited) { break }
        Start-Sleep -Milliseconds 200
    }
    if (-not $ready) { throw "Preview did not start. See $logDir or check whether port 4174 is occupied." }
}
Start-Process $previewUrl
