Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# 背景: ダークサイバー
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 10, 12, 18))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# ネオンシアンボーダー
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 242, 255), 20)
$g.DrawRectangle($pen, 30, 30, 452, 452)

# マゼンタ内枠
$innerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 0, 127), 8)
$g.DrawRectangle($innerPen, 60, 60, 392, 392)

# テキスト HUD
$font = New-Object System.Drawing.Font ("Arial", 110, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 242, 255))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF (0, 0, $width, $height)
$g.DrawString("HUD", $font, $textBrush, $rect, $format)

$outPath = "C:\Users\mogiy\.gemini\antigravity\scratch\deepsync-widget\app-icon-512.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Output "Square Icon PNG generated at $outPath"
