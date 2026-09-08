$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\dist')).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:5173/')
$listener.Start()

$contentTypes = @{
  '.css' = 'text/css; charset=utf-8'; '.html' = 'text/html; charset=utf-8'
  '.ico' = 'image/x-icon'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.map' = 'application/json; charset=utf-8'
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.webmanifest' = 'application/manifest+json; charset=utf-8'
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relativePath = [uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
      $filePath = Join-Path $root $relativePath
      $resolvedPath = [System.IO.Path]::GetFullPath($filePath)

      if (-not $resolvedPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        $resolvedPath = Join-Path $root 'index.html'
      }

      $extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
      $context.Response.ContentType = $contentTypes[$extension]
      if (-not $context.Response.ContentType) { $context.Response.ContentType = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $context.Response.StatusCode = 500
    } finally {
      $context.Response.Close()
    }
  }
} finally {
  $listener.Close()
}
