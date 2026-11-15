# Đặc Tả Yêu Cầu Tổng Quan (Overall SRS)

## 1. Bối Cảnh & Mục Tiêu

Công cụ `agy` (Antigravity CLI) lưu trữ phiên đăng nhập OAuth trong OS Keyring riêng biệt của từng máy (`gemini:antigravity`) nhưng chưa cung cấp lệnh gốc để sao lưu hoặc nhập lại trạng thái xác thực sang máy khác / khôi phục sau khi đăng xuất. Đồng thời, lập trình viên sử dụng song song **Claude Code** và **Antigravity** gặp khó khăn khi phải duy trì thủ công hai hệ thống cấu hình (`agents`, `skills`, `rules`, `mcp`, `commands`, `hooks`) có vị trí và lược đồ khác nhau ở cả cấp dự án lẫn toàn cục.

`agy-tools` là công cụ CLI viết bằng TypeScript/Node.js nhằm giải quyết hai bài toán trên:
1. **Sao lưu & Khôi phục xác thực `agy`:** Xuất và nhập thông tin đăng nhập OAuth của `agy` qua một tệp JSON đơn lẻ (Single-Account JSON), hỗ trợ mã hóa tùy chọn bằng AES-256-GCM.
2. **Đồng bộ cấu hình Agent 2 chiều:** Chuyển đổi và đồng bộ cấu hình giữa Claude Code và Antigravity theo hướng tường minh (`claude -> agy` hoặc `agy -> claude`) ở cả hai phạm vi `project` và `global`.

## 2. Phạm Vi Hệ Thống

### Trong phạm vi (In Scope)
- Hỗ trợ cross-platform: Windows, macOS, Linux (kèm file fallback cho môi trường headless).
- Giao diện CLI kép: chạy trực tiếp qua subcommands/flags và chế độ tương tác (checkbox chọn nhóm cấu hình, prompt xác nhận).
- Auth backup/import dưới dạng 1 tệp JSON cho 1 tài khoản, hỗ trợ `--encrypt`.
- Đồng bộ 6 nhóm cấu hình: Agents/Subagents, Skills, Rules/Instructions, MCP Servers, Slash Commands, Hooks.
- Phát hiện xung đột, xem trước thay đổi (`--dry-run` / preview), tự động sao lưu `.bak` trước khi ghi đè, báo cáo chi tiết các mục đã chuyển đổi hoặc bỏ qua.

### Ngoài phạm vi (Out of Scope)
- Giao diện web hoặc desktop GUI.
- Quản lý đa tài khoản dạng daemon/proxy gateway chạy nền (như Antigravity Manager).
- Đồng bộ tự động thời gian thực (file watcher) hoặc hợp nhất 2 chiều không chỉ định hướng.
- Di chuyển lịch sử hội thoại, cache phiên làm việc hoặc binary plugins đã biên dịch.

## 3. Luồng Nghiệp Vụ Chính

1. **Luồng Auth Backup / Import:** Chi tiết tại [Auth Backup & Import Spec](../03_features/01_auth_backup_import/spec.md).
2. **Luồng Agent Config Sync:** Chi tiết tại [Agent Config Sync Spec](../03_features/02_agent_config_sync/spec.md).
