# show-tree.ps1 - Display project file structure excluding bulk folders
# Usage: .\show-tree.ps1
#        .\show-tree.ps1 -Path "C:\some\other\path"
#        .\show-tree.ps1 -OutputFile "structure.txt"

param(
    [string]$Path = (Get-Location).Path,
    [string]$OutputFile = "",
    [string[]]$Exclude = @('node_modules', 'venv', '__pycache__', '.next', '.git', '.venv', 'dist', '.cache')
)

# Box-drawing characters via Unicode escapes to avoid encoding issues
$PIPE   = [char]0x2502  # |
$TEE    = [char]0x251C  # |-
$ELBOW  = [char]0x2514  # L
$DASH   = [char]0x2500  # -

$PREFIX_LAST    = "$ELBOW$DASH$DASH "
$PREFIX_MID     = "$TEE$DASH$DASH "
$INDENT_LAST    = "    "
$INDENT_MID     = "$PIPE   "

function Show-Tree {
    param(
        [string]$TreePath,
        [string]$Indent = ""
    )

    $items = Get-ChildItem -Path $TreePath -Force |
        Where-Object { $_.Name -notin $Exclude } |
        Sort-Object { -not $_.PSIsContainer }, Name

    $count = $items.Count
    $i = 0

    foreach ($item in $items) {
        $i++
        $isLast = ($i -eq $count)

        if ($isLast) {
            $prefix = $PREFIX_LAST
            $childIndent = "$Indent$INDENT_LAST"
        } else {
            $prefix = $PREFIX_MID
            $childIndent = "$Indent$INDENT_MID"
        }

        Write-Output "$Indent$prefix$($item.Name)"

        if ($item.PSIsContainer) {
            Show-Tree -TreePath $item.FullName -Indent $childIndent
        }
    }
}

$resolvedPath = (Resolve-Path $Path).Path
$output = @($resolvedPath) + @(Show-Tree -TreePath $resolvedPath)

if ($OutputFile) {
    $output | Out-File -FilePath $OutputFile -Encoding utf8
    Write-Host "Tree saved to $OutputFile" -ForegroundColor Green
} else {
    $output | Write-Output
}
