# One-time script: log into Vercel, set env vars, redeploy.
# Run in PowerShell from the project root:
#   .\scripts\fix-vercel.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$ProductionUrl = "https://redknot-rent-a-car-nine.vercel.app"
$EnvFile = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $EnvFile)) {
  throw "Missing .env file at $EnvFile"
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    $envVars[$key] = $value
  }
}

$DatabaseUrl = $envVars["DATABASE_URL"]
$AuthSecret = $envVars["AUTH_SECRET"]

if (-not $DatabaseUrl -or -not $AuthSecret) {
  throw "DATABASE_URL and AUTH_SECRET must be set in .env"
}

Write-Host "RedKnot Vercel fix script" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
  npm install -g vercel
}

if (-not (Test-Path "$env:USERPROFILE\.vercel\auth.json")) {
  Write-Host "Log into Vercel in your browser (use the Randills96 / redknot account)..." -ForegroundColor Yellow
  vercel login
}

Write-Host "Linking project (choose the existing redknot-rent-a-car project if asked)..." -ForegroundColor Yellow
vercel link --yes 2>$null
if ($LASTEXITCODE -ne 0) {
  vercel link
}

function Set-VercelEnv {
  param(
    [string]$Name,
    [string]$Value
  )

  Write-Host "Setting $Name ..." -ForegroundColor Green
  $Value | vercel env add $Name production --force 2>$null
  if ($LASTEXITCODE -ne 0) {
    $Value | vercel env add $Name production
  }
  $Value | vercel env add $Name preview --force 2>$null
  $Value | vercel env add $Name development --force 2>$null
}

Set-VercelEnv -Name "DATABASE_URL" -Value $DatabaseUrl
Set-VercelEnv -Name "AUTH_SECRET" -Value $AuthSecret
Set-VercelEnv -Name "NEXTAUTH_URL" -Value $ProductionUrl
Set-VercelEnv -Name "AUTH_URL" -Value $ProductionUrl

Write-Host ""
Write-Host "Deploying to production..." -ForegroundColor Cyan
vercel deploy --prod --yes

Write-Host ""
Write-Host "Done. Open on your phone:" -ForegroundColor Green
Write-Host "$ProductionUrl/login"
