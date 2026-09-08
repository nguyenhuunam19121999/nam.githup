# Lưu nhanh trạng thái code dưới máy
# .\save.ps1 ➜ Để lưu nhanh code.
git status
$msg = Read-Host "Nhap ghi chu cho ban luu nay (Commit message)"
if (-not $msg) { $msg = "Luu nhanh local" }
git add -A
git commit -m $msg
Write-Host "--- Da tao diem luu local thanh cong! ---" -ForegroundColor Green
