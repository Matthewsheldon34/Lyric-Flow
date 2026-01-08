$response = Invoke-RestMethod -Method DELETE -Uri "http://localhost:5000/admin/reset-all-users"
Write-Host "✅ $($response.message)"
Write-Host "📊 Deleted $($response.deletedCount) users"
