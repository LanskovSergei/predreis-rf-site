# Экспорт офicialных .xls бланков в PDF для pdf-templates/
# Требуется Microsoft Excel на Windows.

$ErrorActionPreference = 'Stop'
$templates = Join-Path $PSScriptRoot '..' '_epl_calc_src' 'public' 'pdf-templates'
$files = @(
    @{ Xls = 'putevoi-list-f3-2.xls'; Pdf = 'form-3-blank.pdf' },
    @{ Xls = 'putevoy_list_gruzovogo_avtomobilya-forma_4-c.xls'; Pdf = 'form-4c-blank.pdf' }
)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    foreach ($item in $files) {
        $xls = Join-Path $templates $item.Xls
        $pdf = Join-Path $templates $item.Pdf
        if (-not (Test-Path $xls)) { throw "Not found: $xls" }
        $wb = $excel.Workbooks.Open($xls)
        # xlTypePDF = 0
        $wb.ExportAsFixedFormat(0, $pdf)
        $wb.Close($false)
        Write-Host "OK: $($item.Pdf)"
    }
}
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}

Write-Host "Done. Restart calculator build after PDF files appear."
