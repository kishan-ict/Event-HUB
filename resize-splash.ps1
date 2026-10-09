Add-Type -AssemblyName System.Drawing

$logoPath = "c:\Users\ADMIN\Desktop\ALEROPATH\websit\logo-images\aleropath-main_logo.jpg"
$resBase = "c:\Users\ADMIN\Desktop\ALEROPATH\websit\Event-flow\android\app\src\main\res"

$src = [System.Drawing.Image]::FromFile($logoPath)

# Splash screen typical sizes
$sizes = @{
    "drawable" = @(480, 800)
    "drawable-port-mdpi" = @(320, 480)
    "drawable-port-hdpi" = @(480, 800)
    "drawable-port-xhdpi" = @(720, 1280)
    "drawable-port-xxhdpi" = @(960, 1600)
    "drawable-port-xxxhdpi" = @(1280, 1920)
    "drawable-land-mdpi" = @(480, 320)
    "drawable-land-hdpi" = @(800, 480)
    "drawable-land-xhdpi" = @(1280, 720)
    "drawable-land-xxhdpi" = @(1600, 960)
    "drawable-land-xxxhdpi" = @(1920, 1280)
}

# The logo should be drawn centered on a dark background
foreach ($entry in $sizes.GetEnumerator()) {
    $dir = Join-Path $resBase $entry.Key
    
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $dest = Join-Path $dir "splash.png"
    $width = $entry.Value[0]
    $height = $entry.Value[1]

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Fill background with dark color (e.g. #0f172a which is Tailwind slate-900)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)
    $bgBrush.Dispose()

    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    # Calculate logo size (e.g. 50% of the smaller dimension)
    $minDim = [Math]::Min($width, $height)
    $logoSize = [Math]::Floor($minDim * 0.5)
    
    $x = ($width - $logoSize) / 2
    $y = ($height - $logoSize) / 2

    $g.DrawImage($src, $x, $y, $logoSize, $logoSize)
    $g.Dispose()

    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Saved Splash $width x $height -> $dest"
}

$src.Dispose()
Write-Host "All splash screens generated!"
