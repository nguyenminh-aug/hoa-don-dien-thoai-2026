@echo off
setlocal
cd /d "%~dp0"

rem The shortcut opens the already-built app in dist, so Node.js is not needed.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 }; exit 1"
if errorlevel 1 start "Hoa don server" /b "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\serve-dist.ps1"

rem Wait until the local web server is ready before opening the browser.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "$deadline = (Get-Date).AddSeconds(10); while ((Get-Date) -lt $deadline) { $client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5173); exit 0 } catch { Start-Sleep -Milliseconds 250 } finally { $client.Dispose() } }; exit 1"
if errorlevel 1 (
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Khong the khoi dong may chu cua ung dung. Hay bam chuot phai vao start-hoa-don.cmd va chon Run as administrator mot lan, sau do thu lai.','Hoa don')"
  exit /b 1
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:5173
) else (
  start "" "http://127.0.0.1:5173"
)
