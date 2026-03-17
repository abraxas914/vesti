param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^v\d+\.\d+\.\d+-(rc|beta)\.\d+$')]
  [string]$Tag,

  [string]$Remote = 'origin',

  [switch]$Push,

  [switch]$SkipVersionCheck,

  [switch]$SkipPackage,

  [switch]$AllowLocalPackage
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$currentBranch = (git branch --show-current).Trim()
if (-not $currentBranch) {
  throw 'Cannot detect current git branch.'
}

if ($currentBranch -eq 'main') {
  throw 'Refusing to run on main. Create and use a release branch first.'
}

$dirty = git status --porcelain
if ($dirty) {
  throw 'Working tree is not clean. Commit or stash changes before release tagging.'
}

$expectedVersion = $Tag.TrimStart('v')
if (-not $SkipVersionCheck) {
  $pkgPath = Join-Path $repoRoot 'frontend/package.json'
  if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if ($pkg.version -ne $expectedVersion) {
      throw "Version mismatch: tag $Tag requires frontend/package.json version '$expectedVersion' but found '$($pkg.version)'."
    }
  } else {
    throw 'frontend/package.json not found.'
  }
}

$tagExists = git rev-parse -q --verify "refs/tags/$Tag" 2>$null
if ($LASTEXITCODE -eq 0 -and $tagExists) {
  throw "Tag $Tag already exists. Use a new version tag."
}

if (-not $SkipPackage) {
  if (-not $AllowLocalPackage) {
    throw "Local packaging is disabled by policy. Use -SkipPackage and package via CI workflow '.github/workflows/extension-package.yml'. If you must override, pass -AllowLocalPackage explicitly."
  }

  pnpm -C frontend build
  if ($LASTEXITCODE -ne 0) {
    throw 'Build failed.'
  }

  pnpm -C frontend package:ci
  if ($LASTEXITCODE -ne 0) {
    throw 'Package failed.'
  }

  $srcZip = Join-Path $repoRoot 'frontend/build/chrome-mv3-prod.zip'
  if (-not (Test-Path $srcZip)) {
    throw 'Expected package artifact missing: frontend/build/chrome-mv3-prod.zip'
  }

  $releaseDir = Join-Path $repoRoot 'release'
  New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

  $releaseZip = Join-Path $releaseDir ("Vesti_MVP_{0}.zip" -f $Tag)
  Copy-Item -Path $srcZip -Destination $releaseZip -Force
  Write-Host "Created release artifact: $releaseZip"
}

$head = (git rev-parse --short HEAD).Trim()
$tagMessage = "Release $Tag from $currentBranch ($head)"

git tag -a $Tag -m $tagMessage
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create tag $Tag"
}

Write-Host "Created annotated tag: $Tag"

if ($Push) {
  git push $Remote $currentBranch
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to push branch $currentBranch to $Remote"
  }

  git push $Remote $Tag
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to push tag $Tag to $Remote"
  }

  Write-Host "Pushed branch and tag to $Remote"
} else {
  Write-Host "Tag created locally. To push manually:"
  Write-Host "  git push $Remote $currentBranch"
  Write-Host "  git push $Remote $Tag"
}
