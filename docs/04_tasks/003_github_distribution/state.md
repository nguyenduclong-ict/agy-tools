# Trạng Thái Task: 003 — Phân Phối CLI Trực Tiếp Từ GitHub

- **Trạng thái:** `Completed` (`Implemented (Production)`)
- **Tiến độ:** `100%`
- **Blockers:** Không có

## Nhật Ký Thực Hiện (Execution Log)

- `2026-11-15`: Cập nhật [ADR-001](../../02_basic_design/decisions/ADR-001-tech-stack.md), gỡ `dist/` khỏi `.gitignore`, tạo `README.md` và xác minh bằng `npm pack --dry-run`.
- `2026-11-15`: Đổi script `build` -> `bundle` trong `package.json` để tránh `npm i -g https://github.com/...` kích hoạt `pacote` `#prepareDir` (gây Junction trỏ tới `_cacache/tmp/git-clone*` thiếu `dist/`); đã xác minh bằng `npm i -g git+file:///...` không cần `--install-links`.
