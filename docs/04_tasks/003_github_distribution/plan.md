# Kế Hoạch Triển Khai: 003 — Phân Phối CLI Trực Tiếp Từ GitHub

**Quyết định kiến trúc:** [ADR-001](../../02_basic_design/decisions/ADR-001-tech-stack.md)

## 1. Mục Tiêu Kỹ Thuật

Đảm bảo người dùng có thể cài đặt trực tiếp qua `npm install -g github:<owner>/agy-tools` hoặc `npx github:<owner>/agy-tools` và chạy lệnh `agy-tools` ngay lập tức mà không cần bước biên dịch trên máy đích.

## 2. Danh Sách Tệp Thay Đổi / Tạo Mới

- `.gitignore` (gỡ `dist/` để track `dist/index.js`)
- `package.json` (đổi script `build` -> `bundle` để `npm i -g <git-url>` không kích hoạt `pacote` `#prepareDir` làm tạo Junction thiếu `dist/`)
- `README.md` (hướng dẫn cài đặt GitHub, sử dụng lệnh, và quy trình `npm run bundle` trước khi commit)

## 3. Checklist Công Việc

- [x] Bỏ `dist/` khỏi `.gitignore` và kiểm tra `package.json` (`bin`, `files`, `scripts`).
- [x] Biên dịch `dist/index.js` bằng `npm run bundle` kèm shebang `#!/usr/bin/env node`.
- [x] Viết `README.md` hướng dẫn cài đặt qua `github:<owner>/agy-tools` và sử dụng CLI.
- [x] Xác minh đóng gói bằng `npm pack --dry-run` (chỉ gồm `dist/index.js` và `package.json`).
