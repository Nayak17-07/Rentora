$docxPath = (Resolve-Path "final_submission\Rentora_Revised_Research_Paper.docx").Path
$pdfPath = [System.IO.Path]::ChangeExtension($docxPath, ".pdf")

Write-Output "Converting $docxPath to $pdfPath via Word COM..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($docxPath)
    $doc.SaveAs([ref]$pdfPath, [ref]17)
    $doc.Close([ref]$false)
    Write-Output "Successfully created PDF: $pdfPath"
} catch {
    Write-Error $_
} finally {
    $word.Quit()
}

