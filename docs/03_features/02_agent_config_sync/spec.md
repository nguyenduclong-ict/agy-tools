# Đặc Tả Tính Năng: Đồng Bộ Agents Config Giữa Claude Code & Antigravity

**Trạng thái:** `Implemented (Production)`

## 1. Mục Tiêu & Bối Cảnh

Cho phép đồng bộ cấu hình Agent theo hướng tường minh giữa **Claude Code** và **Antigravity** (`claude -> agy` hoặc `agy -> claude`) ở cả hai phạm vi **`project`** và **`global`**, giúp tái sử dụng các định nghĩa Agents/Subagents, Skills, Rules, MCP Servers, Slash Commands và Hooks giữa hai công cụ mà không cần chuyển đổi thủ công.

Tài liệu liên quan: [CLI Interface Overview](../../02_basic_design/01_api_overview.md), [ADR-003](../../02_basic_design/decisions/ADR-003-project-scope-plugin-mcp.md), [Conventions](../../00_common/conventions.md).

## 2. Phạm Vi (Scope)

### Trong phạm vi (In Scope)
- Đồng bộ 2 chiều theo hướng chỉ định (`claude -> agy` hoặc `agy -> claude`).
- Hai chế độ phạm vi:
  - `project`: thao tác trên thư mục dự án hiện tại (hoặc `--project-dir <path>`).
  - `global`: thao tác trên thư mục cấu hình toàn cục của người dùng (`$HOME`).
- Hỗ trợ 6 nhóm cấu hình: `agents`, `skills`, `rules`, `mcp`, `commands`, `hooks`.
- Chế độ tương tác: hiển thị **checkbox** chọn nhóm cấu hình, mặc định tick sẵn 3 nhóm khuyến nghị (`agents`, `skills`, `rules`).
- Phát hiện xung đột, xem trước diff, tự động sao lưu `.bak` trước khi ghi đè, hỗ trợ `--dry-run`, `--force`, `--skip-existing`.
- Chuyển đổi theo cơ chế Best-Effort Mapping kèm bảng báo cáo chi tiết các mục `converted`, `skipped`, và `warnings`.

### Ngoài phạm vi (Out of Scope)
- Đồng bộ tự động không chỉ định hướng (two-way auto-merge theo timestamp/state DB).
- Xóa các tệp dư thừa ở bên đích không tồn tại ở bên nguồn (không chạy mirror delete).
- Chuyển đổi `permissions` allow-list hoặc Claude plugins nhị phân trong `~/.claude/plugins/` (đã có `agy plugin import claude`).

## 3. Yêu Cầu Chức Năng (Functional Requirements)

| Mã | Tên yêu cầu | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-201** | Chọn hướng & mode đồng bộ | Nhận `--from <claude\|agy>`, `--to <claude\|agy>`, `--mode <project\|global>`. Nếu chạy tương tác và thiếu cờ, hiển thị prompt chọn hướng và mode. Từ chối nếu `from === to`. |
| **FR-202** | Chọn nhóm cấu hình qua Checkbox / Flags | Hỗ trợ cờ `-c, --categories` hoặc chế độ checkbox tương tác với 6 lựa chọn: `agents` (checked), `skills` (checked), `rules` (checked), `mcp` (unchecked), `commands` (unchecked), `hooks` (unchecked). |
| **FR-203** | Đồng bộ Agents / Subagents (`agents`) | Chuyển đổi qua lại các tệp `*.md` giữa `.claude/agents/` (`~/.claude/agents/`) và `.agents/agents/` (`~/.gemini/config/agents/`), ánh xạ frontmatter (`name`, `description`, `tools`, `subagent`, `mainAgent`). |
| **FR-204** | Đồng bộ Skills (`skills`) | Sao chép thư mục `skills/<name>/` (bao gồm `SKILL.md`, `scripts/`, `references/`, `examples/`, `resources/`, `assets/`), chuẩn hóa frontmatter `name` & `description` cho Antigravity khi thiếu. |
| **FR-205** | Đồng bộ Rules / Instructions (`rules`) | Đồng bộ tệp gốc `CLAUDE.md` ↔ `GEMINI.md` (khi đọc ngược `agy -> claude` ở `project`, ưu tiên `GEMINI.md`, fallback `AGENTS.md`) và các tệp rule con trong `rules/*.md` kèm ánh xạ `paths` ↔ `trigger`/`globs`. |
| **FR-206** | Đồng bộ MCP Servers (`mcp`) | Đồng bộ `mcpServers` giữa `.mcp.json` / `~/.claude.json` và `.agents/plugins/project-scope/mcp_config.json` (mode `project`) hoặc `~/.gemini/config/mcp_config.json` (mode `global`), giữ nguyên các server/khóa khác trong tệp đích. |
| **FR-207** | Đồng bộ Slash Commands (`commands`) | Hướng `claude -> agy`: chuyển `commands/**/*.md` thành `skills/<cmd-slug>/SKILL.md`. Hướng `agy -> claude`: khôi phục các skill có dấu hiệu command (hoặc giữ ở `skills/` và báo cáo rõ). |
| **FR-208** | Đồng bộ Hooks (`hooks`) | Chuyển đổi best-effort các event hook `command` tương thích (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`) giữa `settings.json` (`hooks`) của Claude và `hooks.json` của Antigravity kèm ánh xạ tên tool. |
| **FR-209** | Phát hiện xung đột, Preview & `.bak` | So sánh nội dung chuẩn hóa với tệp đích hiện có; hiển thị danh sách tệp thay đổi/diff khi có xung đột; tạo `.bak` trước khi ghi đè trừ khi bật `--no-backup`. |
| **FR-210** | Dry-Run & Báo cáo tổng kết | Cờ `--dry-run` mô phỏng toàn bộ quá trình chuyển đổi và hiển thị kế hoạch/cảnh báo mà không ghi bất kỳ tệp nào. Kết thúc lệnh luôn in bảng tổng hợp `created`, `updated`, `unchanged`, `skipped`, `warnings`. |

## 4. Quy Tắc Nghiệp Vụ (Business Rules)

| Mã | Quy tắc |
| :--- | :--- |
| **BR-201** | **Project Root Resolution:** Ở mode `project`, nếu người dùng truyền `--project-dir`, dùng đường dẫn đó; nếu không, tìm thư mục gốc chứa `.git`, `.claude` hoặc `.agents` đi ngược từ `process.cwd()`, fallback về `process.cwd()`. |
| **BR-202** | **Bảo toàn dữ liệu ngoài phạm vi trong JSON tổng hợp:** Khi ghi `mcpServers` vào `~/.claude.json` hoặc ghi `hooks` vào `settings.json`, chỉ gộp/cập nhật đúng nhánh tương ứng theo tên khóa, giữ nguyên toàn bộ cấu trúc và khóa còn lại của tệp JSON. |
| **BR-203** | **Plugin `project-scope` cho Project MCP:** Khi đồng bộ `mcp` ở mode `project` hướng `claude -> agy`, tự động tạo `.agents/plugins/project-scope/plugin.json` (nếu chưa có) cùng `.agents/plugins/project-scope/mcp_config.json`. |
| **BR-204** | **Best-Effort Mapping & Cảnh báo minh bạch:** Mọi trường/công cụ không tương thích 1-1 (như legacy SSE MCP `/sse`, `model` alias riêng của Claude như `sonnet`/`opus`, hook type `prompt`/`agent`, rule `trigger: model_decision` khi chuyển về Claude, hoặc file rule > 24,000 bytes phía Antigravity) không làm crash quá trình sync mà được bỏ qua/chuyển đổi an toàn và ghi nhận vào danh sách `warnings`/`skipped`. |
| **BR-205** | **Xung đột & Cờ điều khiển:** Nếu không truyền `--force` hay `--skip-existing`: ở chế độ tương tác hỏi người dùng (`Overwrite all` / `Skip all` / `Ask each` / `Abort`); ở chế độ non-interactive (`--yes` mà không chọn policy) mặc định chọn an toàn hoặc trả mã `SYNC_CONFLICT_ABORTED` nếu có cờ nghiêm ngặt (chi tiết tại [logic.md](./logic.md)). |
| **BR-206** | **An toàn bí mật MCP:** Không in giá trị `env` hoặc `headers` của MCP server ra báo cáo hoặc diff preview ở console (mask giá trị nhạy cảm như `***`). |

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- **AC-201:** Chạy `agy-tools sync` không kèm `--categories` hiển thị checkbox 6 mục với `agents`, `skills`, `rules` được tick sẵn và `mcp`, `commands`, `hooks` bỏ tick.
- **AC-202:** Sync `claude -> agy` ở mode `project` với `.claude/agents/reviewer.md`, `.claude/skills/my-skill/SKILL.md`, `CLAUDE.md`, `.claude/rules/ts.md`, `.mcp.json` tạo đúng các tệp tương ứng tại `.agents/agents/reviewer.md` (có `subagent: true`, `mainAgent: false`, `tools` đã map), `.agents/skills/my-skill/SKILL.md`, `GEMINI.md`, `.agents/rules/ts.md`, và `.agents/plugins/project-scope/mcp_config.json` + `plugin.json`.
- **AC-203:** Sync `agy -> claude` ở mode `project` khi chỉ có `AGENTS.md` (không có `GEMINI.md`) tự động fallback đọc `AGENTS.md` để tạo `CLAUDE.md`, và map `read_file`/`edit_file`/`run_command` về `Read`/`Grep`/`Glob`/`Edit`/`Bash`.
- **AC-204:** Sync `mcp` ở mode `global` hướng `claude -> agy` đọc `mcpServers` từ `~/.claude.json` và gộp vào `~/.gemini/config/mcp_config.json` mà không xóa các server có sẵn trong `mcp_config.json`, đồng thời bỏ qua và cảnh báo server dùng legacy `type: "sse"`.
- **AC-205:** Sync `mcp` ở mode `global` hướng `agy -> claude` cập nhật `mcpServers` trong `~/.claude.json` mà vẫn giữ nguyên toàn bộ các trường khác của `~/.claude.json`, tạo tệp `.bak` trước khi ghi.
- **AC-206:** Khi tệp đích đã tồn tại và có nội dung khác, chạy `sync --force` tạo tệp `.bak` lưu nội dung cũ trước khi ghi đè; chạy `sync --skip-existing` giữ nguyên tệp cũ và ghi nhận `skipped`.
- **AC-207:** Chạy `sync --dry-run` không tạo/sửa/xóa bất kỳ tệp nào trên đĩa (kể cả `.bak`) và in đầy đủ kế hoạch thay đổi cùng bảng cảnh báo.
- **AC-208:** Chạy `sync` với `commands/git/commit.md` hướng `claude -> agy` tạo `.agents/skills/git-commit/SKILL.md` có frontmatter hợp lệ và thay thế `$ARGUMENTS` bằng chỉ dẫn tương đương.
