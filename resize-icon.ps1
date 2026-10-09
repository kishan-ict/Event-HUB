Add-Type -AssemblyName System.Drawing

$logoPath = "c:\Users\ADMIN\Desktop\ALEROPATH\websit\logo-images\aleropath-main_logo.jpg"
$resBase = "c:\Users\ADMIN\Desktop\ALEROPATH\websit\Event-flow\android\app\src\main\res"

$src = [System.Drawing.Image]::FromFile($logoPath)

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $dir = Join-Path $resBase $entry.Key
    $dest = Join-Path $dir "ic_launcher.png"
    $fgDest = Join-Path $dir "ic_launcher_foreground.png"
    $rnDest = Join-Path $dir "ic_launcher_round.png"
    $sz = $entry.Value

    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()

    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($fgDest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($rnDest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Saved $sz x $sz -> $dest"
}

$src.Dispose()
Write-Host "All icon sizes generated!"
