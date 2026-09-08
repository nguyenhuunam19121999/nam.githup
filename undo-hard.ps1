# XOA SACH code loi, ve ban commit gan nhat
# .\undo-hard.ps1 ➜ Để xóa sạch code lỗi vừa viết, làm lại từ đầu.
Write-Host "CANH BAO: Hanh dong nay se xoa sach code loi vua viet!" -ForegroundColor Red
$confirm = Read-Host "Ban co chac chan muon quay xe? (Y/N)"
if ($confirm -eq "Y" -or $confirm -eq "y") {
    git reset --hard HEAD
    Write-Host "--- Da xoa code loi! Khoi phuc ve ban commit gan nhat thanh cong ---" -ForegroundColor Green
} else {
    Write-Host "Da huy lenh." -ForegroundColor Cyan
}
