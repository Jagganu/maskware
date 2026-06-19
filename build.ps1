param([string]$Browser = "chrome")

switch ($Browser.ToLower()) {
  "firefox" {
    Copy-Item -Path "manifest.firefox.json" -Destination "manifest.json" -Force
    Write-Host "Switched to Firefox manifest (background.scripts)"
  }
  "chrome" {
    Copy-Item -Path "manifest.chrome.json" -Destination "manifest.json" -Force
    Write-Host "Switched to Chrome manifest (background.service_worker)"
  }
  default {
    Write-Host "Usage: .\build.ps1 -Browser chrome|firefox"
  }
}
