# Kế Hoạch Triển Khai: 002 — Đồng Bộ Agents Config (`claude` ↔ `agy`)

**Đặc tả:** [spec.md](../../03_features/02_agent_config_sync/spec.md) | [logic.md](../../03_features/02_agent_config_sync/logic.md)

## 1. Mục Tiêu Kỹ Thuật

Triển khai hệ thống đọc/ghi cấu hình cho Claude Code và Antigravity ở cả 2 mode `project` và `global`, bộ chuyển đổi best-effort cho 6 nhóm (`agents`, `skills`, `rules`, `mcp`, `commands`, `hooks`), bộ lập kế hoạch phát hiện xung đột/preview diff/tạo `.bak`, và giao diện checkbox tương tác.

## 2. Danh Sách Tệp Dự Kiến Tạo / Sửa

- `src/core/frontmatter.ts`
- `src/adapters/{types.ts,paths.ts,claude.ts,antigravity.ts}`
- `src/converters/{tools-map.ts,agents.ts,skills.ts,rules.ts,mcp.ts,hooks.ts}`
- `src/sync/{planner.ts,runner.ts}`
- Cập nhật `src/cli/{index.ts,prompts.ts,formatters.ts}`
- `tests/sync/{converters.test.ts,sync-project.test.ts,sync-global.test.ts}`

## 3. Checklist Theo Tiêu Chí Nghiệm Thu (`AC-xxx`)

- [x] **AC-201:** `agy-tools sync` tương tác hiển thị checkbox 6 nhóm với `agents`, `skills`, `rules` được tick sẵn mặc định.
- [x] **AC-202:** Sync `claude -> agy` mode `project` chuyển đổi đầy đủ `agents`, `skills`, `CLAUDE.md` -> `GEMINI.md`, `rules`, và `.mcp.json` -> `.agents/plugins/project-scope/{mcp_config.json,plugin.json}`.
- [x] **AC-203:** Sync `agy -> claude` mode `project` fallback `AGENTS.md` khi thiếu `GEMINI.md` và map ngược tool (`read_file` -> `Read, Grep, Glob`, ...).
- [x] **AC-204:** Sync `mcp` mode `global` hướng `claude -> agy` gộp `mcpServers` từ `~/.claude.json` vào `~/.gemini/config/mcp_config.json`, bỏ qua và cảnh báo legacy SSE.
- [x] **AC-205:** Sync `mcp` mode `global` hướng `agy -> claude` giữ nguyên các khóa khác của `~/.claude.json` và tạo `.bak` trước khi ghi.
- [x] **AC-206:** Xử lý xung đột với `--force` (tạo `.bak` trước ghi đè), `--skip-existing`, và chế độ tương tác xem diff.
- [x] **AC-207:** `--dry-run` không thay đổi bất kỳ tệp nào trên đĩa và in đầy đủ kế hoạch + bảng cảnh báo.
- [x] **AC-208:** Chuyển `commands/git/commit.md` hướng `claude -> agy` thành `.agents/skills/git-commit/SKILL.md` với frontmatter hợp lệ và thay thế `$ARGUMENTS`.

## 4. Kế Hoạch Kiểm Thử

- Unit test từng converter (`agents`, `skills`, `rules`, `mcp`, `commands`, `hooks`) cả 2 chiều.
- Integration test `project` mode và `global` mode trên temp directories (kiểm tra merge `~/.claude.json`, `settings.json`, `project-scope` plugin, `.bak`, `--dry-run`, `--skip-existing`, `--force`).
- Chạy thực tế `agy-tools sync --from agy --to claude --mode project --dry-run` trên workspace hiện tại.
