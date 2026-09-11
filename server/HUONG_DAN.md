# Khôi phục hóa đơn và chặn ghi đè

Dữ liệu đã đọc: bản sao 125lKAl0HSxAMGsjly1KTndYJodbLDiX6uvy3gmrQjkk có 15 hóa đơn cũ; bảng chính có 5 hóa đơn mới. Kết quả ghép đã kiểm tra: 35 khách hàng, 20 hóa đơn, 17 thanh toán; không trùng mã, không thiếu liên kết, tổng tiền khớp chi tiết.

## Thực hiện bằng tài khoản chủ sở hữu

1. Đóng ứng dụng hóa đơn trên các thiết bị trong lúc sửa.
2. Trong Apps Script gắn với bảng chính, lưu một bản mã cũ rồi thay toàn bộ mã bằng nội dung Code.gs trong thư mục này. Lưu.
3. Chọn Triển khai > Quản lý các bản triển khai > chọn Web App đang dùng > Chỉnh sửa (bút chì) > Phiên bản mới > Triển khai. Giữ nguyên URL và quyền truy cập hiện có. Nếu còn các bản triển khai khác dùng mã cũ và ghi cùng bảng này, cập nhật chúng trước khi phục hồi.
4. Chọn hàm recoverInvoicesOnce rồi Chạy. Hàm đọc lại dữ liệu hiện tại, ghép bản sao theo mã, giữ bản hiện tại khi trùng mã, kiểm tra liên kết và lưu một tab Backup_... trước khi ghi. Hàm không thay dữ liệu bản sao nguồn.
5. Nhật ký dự kiến KhachHang=35, HoaDon=20, ThanhToan=17. Nếu đã phát sinh dữ liệu mới thì số lượng có thể lớn hơn. Mở tab HoaDon kiểm tra cả ngày 9, 10 và 11/9. Nếu lỗi khi dựng tab hiển thị, chạy repairDisplayTables; không chạy lại mã cũ.

## Phạm vi bảo vệ

Máy chủ từ chối mọi yêu cầu sync cũ; không nhận bản dữ liệu thiếu mã đang có. Giao thức sync-v2 yêu cầu baseRevision khớp, khóa ghi xuyên suốt đọc/kiểm tra/ghi, lưu bản trước thay đổi. Chưa hỗ trợ xóa bản ghi qua đồng bộ. Dữ liệu JSON quá 45.000 ký tự bị từ chối trước khi ghi để tránh vượt dung lượng ô; cần chuyển sang lưu mỗi bản ghi riêng trước khi đạt ngưỡng này. Bản phục hồi hiện có 39.745 ký tự cho hóa đơn.

Bản ứng dụng mới dùng giao thức v2. Thiết bị đọc phiên bản hiện tại, đối chiếu thay đổi với lần đồng bộ trước, gửi kèm baseRevision và đọc lại để xác nhận. Hai thiết bị sửa cùng bản ghi khác nhau sẽ báo xung đột. Dùng Tải bản sao trên máy trước khi chọn Tải bản Google Sheets để đối chiếu. Không xóa dữ liệu trình duyệt khi còn thay đổi chưa đồng bộ. Cài đặt tỷ giá và URL vẫn thuộc thiết bị; dữ liệu nghiệp vụ được đồng bộ.

Kiểm thử tự động: npm run test:safety. Bao gồm đồng bộ đa thiết bị, mất mạng, xung đột, xác nhận sau POST, thùng rác và máy chủ. Bản phát triển còn có bộ kiểm thử đăng nhập/phân quyền riêng.

Tài liệu Google về khóa ghi: https://developers.google.com/apps-script/reference/lock/

## Xóa hóa đơn nhập sai

Xóa hóa đơn chuyển bản ghi vào thùng rác bằng deletedAt; không xóa mã hay thanh toán gốc. Doanh thu, công nợ, thanh toán đang hiển thị và hàng tồn tính lại từ các hóa đơn chưa xóa. Vào Cài đặt > Thùng rác hóa đơn để khôi phục. Thao tác này không tự hoàn tiền. Khi đổi phương thức COD, các khoản COD hệ thống bị hủy cũng được giữ dấu xóa để máy chủ không từ chối vì mất bản ghi.
