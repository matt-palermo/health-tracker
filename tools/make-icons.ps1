param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $OutDir | Out-Null

function New-Icon([int]$size, [string]$path, [double]$contentScale, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 11, 13, 16))
  if ($rounded) {
    $r = $size * 0.22
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
    $p.AddArc($size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
    $p.AddArc($size - $r * 2, $size - $r * 2, $r * 2, $r * 2, 0, 90)
    $p.AddArc(0, $size - $r * 2, $r * 2, $r * 2, 90, 90)
    $p.CloseFigure()
    $g.FillPath($bg, $p)
  } else {
    $g.FillRectangle($bg, 0, 0, $size, $size)
  }

  # Content box (smaller for maskable icons so it survives circle/squircle masks)
  $c = $size * $contentScale
  $o = ($size - $c) / 2
  $stroke = $c * 0.11
  $ringBox = New-Object System.Drawing.RectangleF ($o + $stroke / 2 + $c * 0.06), ($o + $stroke / 2 + $c * 0.06), ($c - $stroke - $c * 0.12), ($c - $stroke - $c * 0.12)

  $track = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 36, 42, 51)), $stroke
  $g.DrawEllipse($track, $ringBox)

  $green = [System.Drawing.Color]::FromArgb(255, 62, 230, 143)
  $arc = New-Object System.Drawing.Pen $green, $stroke
  $arc.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arc.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($arc, $ringBox, -90, 270)

  # Check mark in the middle
  $check = New-Object System.Drawing.Pen $green, ($stroke * 0.95)
  $check.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $check.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $check.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $cx = $size / 2; $cy = $size / 2; $u = $c * 0.13
  $pts = @(
    (New-Object System.Drawing.PointF ($cx - 1.35 * $u), ($cy + 0.05 * $u)),
    (New-Object System.Drawing.PointF ($cx - 0.35 * $u), ($cy + 1.0 * $u)),
    (New-Object System.Drawing.PointF ($cx + 1.45 * $u), ($cy - 0.95 * $u))
  )
  $g.DrawLines($check, $pts)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 512 (Join-Path $OutDir "icon-512.png") 0.86 $true
New-Icon 192 (Join-Path $OutDir "icon-192.png") 0.86 $true
New-Icon 512 (Join-Path $OutDir "icon-maskable-512.png") 0.66 $false
New-Icon 180 (Join-Path $OutDir "apple-touch-icon.png") 0.80 $false
New-Icon 32 (Join-Path $OutDir "favicon-32.png") 0.95 $true
Get-ChildItem $OutDir | Select-Object Name, Length
