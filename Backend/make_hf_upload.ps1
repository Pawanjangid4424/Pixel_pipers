# ---------------------------------------------------------------------------
# Creates the folder  ..\hf_upload  with ONLY the files Hugging Face Spaces needs.
# Drag the contents of that folder into your Space ("Files" -> "Add file" -> "Upload files").
#
# Why: a public Space shows every file, so credentials.json (password + token),
# old_models (41 MB) and temp files must NOT be uploaded.
#
# Run (from the Backend folder):   powershell -ExecutionPolicy Bypass -File .\make_hf_upload.ps1
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$out = Join-Path (Split-Path $src -Parent) 'hf_upload'

# Start from an empty folder every time
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path "$out\PIPE_model" | Out-Null

# Files at the Space root: Dockerfile (how to build) + README.md (Space settings at the top)
Copy-Item "$src\Dockerfile", "$src\.dockerignore", "$src\README.md" $out

# The app itself
$files = 'app.py', 'wsgi.py', 'draw_on_image.py', 'requirements.txt', 'best.pt', 'credentials.example.json'
foreach ($f in $files) { Copy-Item "$src\PIPE_model\$f" "$out\PIPE_model\" }
Copy-Item "$src\PIPE_model\templates", "$src\PIPE_model\static" "$out\PIPE_model\" -Recurse

# Empty retrain folders (the app writes there); .gitkeep so the folders are uploaded
foreach ($d in 'images', 'labels') {
    New-Item -ItemType Directory -Path "$out\PIPE_model\collect-retrain\$d" -Force | Out-Null
    New-Item -ItemType File -Path "$out\PIPE_model\collect-retrain\$d\.gitkeep" -Force | Out-Null
}

Write-Host "Ready: $out" -ForegroundColor Green
Get-ChildItem $out -Recurse -File | ForEach-Object { $_.FullName.Substring($out.Length + 1) }
