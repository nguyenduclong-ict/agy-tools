# ADR-003: Đóng Gói Project MCP Phía Antigravity Thành Plugin `project-scope`

## Trạng thái
Accepted

## Bối cảnh
Ở cấp toàn cục (`global`), Antigravity đọc MCP tại `~/.gemini/config/mcp_config.json`. Tuy nhiên ở cấp dự án (`project`), Antigravity không tự động quét tệp `.agents/mcp_config.json` độc lập mà chỉ tải cấu hình MCP dự án từ các plugin nằm trong `.agents/plugins/<plugin_name>/mcp_config.json`. Trong khi đó Claude Code đặt Project MCP tại `<project>/.mcp.json`.

## Quyết định
Khi đồng bộ nhóm `mcp` ở mode `project`:
- Hướng `claude -> agy`: ghi cấu hình MCP vào `.agents/plugins/project-scope/mcp_config.json` và tự động tạo `.agents/plugins/project-scope/plugin.json` nếu chưa tồn tại.
- Hướng `agy -> claude`: đọc MCP từ `.agents/plugins/project-scope/mcp_config.json` (và cảnh báo nếu dự án có thêm các plugin MCP khác nằm ngoài `project-scope`) để ghi/gộp vào `.mcp.json`.

## Hệ quả
- **Tích cực:** Project MCP hoạt động đúng chuẩn discovery của Antigravity mà không rò rỉ sang cấu hình `global` của máy.
- **Tiêu cực / Đánh đổi:** Tạo thêm 1 thư mục plugin `project-scope` trong `.agents/plugins/` của dự án.
