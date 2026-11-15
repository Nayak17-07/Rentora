$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$tablesDir = Join-Path $projectRoot "Rentora_Paper_Tables_and_Figures"
$xlsxPath = Join-Path $projectRoot "Rentora_Manuscript_Tables.xlsx"
$xlsxCopyPath = Join-Path $tablesDir "Rentora_Manuscript_Tables.xlsx"

Write-Output "Starting Excel automation to build Rentora_Manuscript_Tables.xlsx..."

# Kill any lingering Excel processes
Stop-Process -Name EXCEL -Force -ErrorAction SilentlyContinue

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Add()
    
    $sheetNames = @(
        "Table_I_Feature_Comparison",
        "Table_II_Literature_Comparison",
        "Table_III_Feature_Specs",
        "Table_IV_Churn_Test_Split",
        "Table_V_Stratified_5Fold_CV",
        "Table_VI_Churn_Ablation",
        "Table_VII_Recommender_Baselines",
        "Table_VIII_Recommender_Ablation"
    )

    # Color constants (BGR in Excel COM)
    # #1E293B: R=30, G=41, B=59 -> BGR = 59*65536 + 41*256 + 30 = 3877150
    $headerColor = 3877150
    # #FFFFFF: 16777215
    $whiteColor = 16777215
    # #EFF6FF: R=239, G=246, B=255 -> BGR = 255*65536 + 246*256 + 239 = 16774895
    $highlightColor = 16774895
    # #F8FAFC: R=248, G=250, B=252 -> BGR = 252*65536 + 250*256 + 248 = 16579320
    $zebraColor = 16579320
    # #CBD5E1: R=203, G=213, B=225 -> BGR = 225*65536 + 213*256 + 203 = 14800331
    $borderColor = 14800331

    for ($i = 0; $i -lt $sheetNames.Count; $i++) {
        $sName = $sheetNames[$i]
        $csvFile = Join-Path $tablesDir ($sName + ".csv")
        if (-not (Test-Path $csvFile)) { continue }

        if ($i -eq 0) {
            $ws = $wb.Worksheets.Item(1)
        } else {
            $ws = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wb.Worksheets.Item($wb.Worksheets.Count))
        }
        $ws.Name = $sName.Substring(0, [Math]::Min(31, $sName.Length))
        $excel.ActiveWindow.DisplayGridlines = $true

        # Read CSV
        $csvData = Import-Csv $csvFile
        $headers = $csvData[0].psobject.Properties.Name
        $numCols = $headers.Count
        $numRows = $csvData.Count

        # Row 1: Title
        $titleRange = $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item(1, $numCols))
        $titleRange.Merge()
        $titleRange.Value2 = ($sName -replace "_", " ").ToUpper()
        $titleRange.Font.Name = "Calibri"
        $titleRange.Font.Size = 12
        $titleRange.Font.Bold = $true
        $titleRange.RowHeight = 26
        $titleRange.VerticalAlignment = -4108 # Center

        # Row 2: Headers
        for ($c = 1; $c -le $numCols; $c++) {
            $cell = $ws.Cells.Item(2, $c)
            $cell.Value2 = $headers[$c - 1]
            $cell.Interior.Color = $headerColor
            $cell.Font.Color = $whiteColor
            $cell.Font.Bold = $true
            $cell.Font.Name = "Calibri"
            $cell.Font.Size = 11
            $cell.VerticalAlignment = -4108
            $cell.HorizontalAlignment = if ($c -gt 1) { -4108 } else { -4131 }
            $cell.WrapText = $true
        }
        $ws.Rows.Item(2).RowHeight = 24

        # Data Rows (starting at Row 3)
        for ($r = 1; $r -le $numRows; $r++) {
            $rowIdx = $r + 2
            $rowObj = $csvData[$r - 1]
            $rowText = ($headers | ForEach-Object { $rowObj.$_ }) -join " "
            $isHighlight = ($rowText -match "Rentora|LightGBM|Full Feature")

            for ($c = 1; $c -le $numCols; $c++) {
                $cell = $ws.Cells.Item($rowIdx, $c)
                $val = $rowObj.($headers[$c - 1])

                $cell.Value2 = $val
                $numVal = 0.0
                if ([double]::TryParse($val, [ref]$numVal) -and ($val -match "\.")) {
                    $cell.NumberFormat = "0.000"
                    $cell.HorizontalAlignment = -4152 # Right
                } elseif ([double]::TryParse($val, [ref]$numVal)) {
                    $cell.HorizontalAlignment = -4152 # Right
                } else {
                    $cell.HorizontalAlignment = if ($c -le 2) { -4131 } else { -4108 }
                }

                $cell.Font.Name = "Calibri"
                $cell.Font.Size = 10
                $cell.Font.Bold = ($isHighlight -or ($c -eq 1))
                if ($isHighlight) {
                    $cell.Interior.Color = $highlightColor
                } elseif ($r % 2 -eq 1) {
                    $cell.Interior.Color = $zebraColor
                }

                # Cell borders
                $cell.Borders.Color = $borderColor
                $cell.VerticalAlignment = -4108
            }
            $ws.Rows.Item($rowIdx).RowHeight = 20
        }

        # Auto-fit columns
        $usedCols = $ws.Range($ws.Cells.Item(2, 1), $ws.Cells.Item($numRows + 2, $numCols))
        $usedCols.Columns.AutoFit() | Out-Null
        for ($c = 1; $c -le $numCols; $c++) {
            $w = $ws.Columns.Item($c).ColumnWidth
            if ($w -lt 14) { $ws.Columns.Item($c).ColumnWidth = 14 }
            if ($w -gt 48) { $ws.Columns.Item($c).ColumnWidth = 48 }
        }

        # Freeze panes at A3
        $ws.Activate()
        $freezeCell = $ws.Cells.Item(3, 1)
        $freezeCell.Select() | Out-Null
        $excel.ActiveWindow.FreezePanes = $true
    }

    # Select sheet 1
    $wb.Worksheets.Item(1).Activate()

    # Save
    $wb.SaveAs($xlsxPath, 51) # 51 = xlOpenXMLWorkbook (.xlsx)
    Write-Output "Successfully saved: $xlsxPath"
    
    # Copy to Rentora_Paper_Tables_and_Figures
    Copy-Item -Path $xlsxPath -Destination $xlsxCopyPath -Force
    Write-Output "Successfully copied to: $xlsxCopyPath"

} finally {
    if ($wb) { $wb.Close($false) }
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    Stop-Process -Name EXCEL -Force -ErrorAction SilentlyContinue
}
