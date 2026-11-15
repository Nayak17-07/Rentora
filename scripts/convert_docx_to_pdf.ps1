$files = @(
    "final_submission\Rentora_Revised_Research_Paper.docx",
    "final_submission\Rentora_Anonymized_For_Review.docx"
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
} catch {
    Write-Error $_
} finally {
    $word.Quit()
}
