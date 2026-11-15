# Clean any hanging WINWORD processes first
Stop-Process -Name WINWORD -Force -ErrorAction SilentlyContinue

$files = @(
    "final_submission\Rentora_Revised_Research_Paper.docx",
    "final_submission\Rentora_Anonymized_For_Review.docx",
    "final_submission\Declaration_of_Conflicting_Interests.docx",
    "final_submission\License_Agreement.docx",
    "final_submission\Ghostwriting_Declaration.docx"
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
    foreach ($file in $files) {
        if (Test-Path $file) {
            $docxPath = (Resolve-Path $file).Path
            $pdfPath = [System.IO.Path]::ChangeExtension($docxPath, ".pdf")
            Write-Output "Converting $docxPath to $pdfPath via Word COM..."
            $doc = $word.Documents.Open($docxPath)
            $doc.SaveAs([ref]$pdfPath, [ref]17)
            $doc.Close([ref]$false)
            Write-Output "Successfully created PDF: $pdfPath"
        }
    }

    # Create standardized numbered aliases for clear submission packaging
    $copyMap = @{
        "final_submission\Rentora_Revised_Research_Paper.pdf"     = "final_submission\01_Full_Manuscript.pdf"
        "final_submission\Rentora_Anonymized_For_Review.pdf"      = "final_submission\02_Anonymized_Manuscript.pdf"
        "final_submission\Declaration_of_Conflicting_Interests.pdf"= "final_submission\03_Declaration_of_Conflicting_Interests.pdf"
        "final_submission\License_Agreement.pdf"                 = "final_submission\04_License_Agreement.pdf"
        "final_submission\Ghostwriting_Declaration.pdf"           = "final_submission\05_Ghostwriting_Declaration.pdf"
    }

    foreach ($src in $copyMap.Keys) {
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $copyMap[$src] -Force
            Write-Output "Created submission alias: $($copyMap[$src])"
        }
    }

} catch {
    Write-Error $_
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    Stop-Process -Name WINWORD -Force -ErrorAction SilentlyContinue
}
