# ADR-002: Mô Hình Single-Account JSON Cho Auth Backup & Import

## Trạng thái
Accepted

## Bối cảnh
`agy` CLI lưu toàn bộ thông tin OAuth (`token`, `auth_method`, `id_token`) dưới dạng một chuỗi JSON UTF-8 trong OS Keyring (`gemini:antigravity`). Các công cụ quản lý đa tài khoản như Antigravity Manager dùng 1 tệp JSON chứa mảng tài khoản và thay thế token đang hoạt động khi chuyển đổi, nhưng nhu cầu cốt lõi của `agy-tools` là sao lưu/khôi phục gọn nhẹ theo từng tài khoản.

## Quyết định
Áp dụng mô hình **Single-Account JSON** (1 tệp JSON = 1 tài khoản), mặc định xuất Plain JSON kèm tùy chọn `--encrypt` (AES-256-GCM).

## Hệ quả
- **Tích cực:** Cấu trúc tệp đơn giản, di chuyển giữa các máy dễ dàng, không cần duy trì cơ sở dữ liệu trạng thái đa tài khoản.
- **Tiêu cực / Đánh đổi:** Khi người dùng muốn quản lý nhiều tài khoản, họ tự lưu nhiều tệp JSON riêng biệt (ví dụ `work.json`, `personal.json`) và chạy `agy-tools auth import <file>` để chuyển đổi.
