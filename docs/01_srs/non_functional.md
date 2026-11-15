# Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

## 1. Bảo Mật (Security)

- **Không rò rỉ bí mật qua log/CLI:** Token OAuth (`access_token`, `refresh_token`, `id_token`), passphrase, `env` và `headers` chứa khóa bí mật của MCP không bao giờ được in ra màn hình hoặc lưu vào báo cáo văn bản.
- **Mã hóa chuẩn công nghiệp:** Khi dùng `--encrypt`, sử dụng `AES-256-GCM` với salt ngẫu nhiên 16 bytes, IV ngẫu nhiên 12 bytes và `scrypt` (`N=16384, r=8, p=1`, keylen 32 bytes) từ `node:crypto`. Xác thực tính toàn vẹn bằng GCM auth tag 16 bytes.
- **Quyền tệp chặt chẽ:** Tệp JSON auth xuất ra và tệp fallback trên macOS/Linux bắt buộc thiết lập quyền `0o600`.
- **An toàn tham số:** Tránh truyền secret dưới dạng tham số dòng lệnh lộ trong process list khi gọi công cụ hệ thống (Windows truyền qua stdin/env PowerShell hoặc MemoryStream; Linux `secret-tool store` đọc mật khẩu từ stdin; macOS `security` xử lý cẩn trọng tránh ghi log).

## 2. Độ Tin Cậy & An Toàn Dữ Liệu (Reliability)

- **Ghi nguyên tử (Atomic Write):** Mọi thao tác ghi tệp JSON hoặc Markdown đích ghi vào tệp tạm cùng thư mục rồi `rename` để tránh hỏng tệp khi tiến trình bị ngắt giữa chừng.
- **Bảo toàn cấu hình không liên quan:** Khi cập nhật `~/.claude.json` (chỉ sửa nhánh `mcpServers`) hoặc `settings.json` (chỉ sửa nhánh `hooks`), toàn bộ các trường khác của tệp gốc phải được giữ nguyên vẹn.
- **Khả năng hoàn tác:** Tạo bản sao lưu `.bak` trước khi ghi đè tệp đích hiện có.

## 3. Tương Thích Nền Tảng (Compatibility)

- Hỗ trợ Node.js `>= 20.0.0` trên Windows 10/11 (PowerShell 5.1+ / pwsh), macOS, và Linux (Desktop có `secret-tool` hoặc headless dùng file fallback).
- Chuẩn hóa xuống dòng và phân tách đường dẫn (`path.posix` cho glob/skill relative links, `path` chuẩn cho filesystem).

## 4. Hiệu Năng (Performance)

- Thời gian thực thi `auth backup` / `auth import` dưới 2 giây (không kể thời gian nhập passphrase).
- Thời gian thực thi `sync` cho một dự án thông thường (< 100 tệp cấu hình) dưới 1 giây.
