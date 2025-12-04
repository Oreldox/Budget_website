$files = @(
    "app\api\organizations\join\route.ts",
    "app\api\organizations\route.ts",
    "app\api\users\[id]\route.ts",
    "app\api\users\route.ts"
)

foreach ($file in $files) {
    $path = Join-Path "." $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $content = $content -replace 'changes: \{ ([^}]+) \},', 'changes: JSON.stringify({ $1 }),'
        $content = $content -replace 'changes: \{([^}]+)\},', 'changes: JSON.stringify({$1}),'
        Set-Content $path -Value $content -NoNewline
        Write-Host "Fixed: $file"
    }
}
