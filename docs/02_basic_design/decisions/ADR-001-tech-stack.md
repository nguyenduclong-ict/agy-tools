# ADR-001: Lựa Chọn TypeScript / Node.js Cho CLI Tool

## Trạng thái
Accepted

## Bối cảnh
`agy-tools` cần thao tác với hệ thống tệp cấu hình Markdown/YAML/JSON, hiển thị giao diện checkbox tương tác trên terminal, mã hóa AES-256-GCM và đọc/ghi OS Keyring (`gemini:antigravity`) trên Windows, macOS, Linux. Trên máy phát triển có sẵn Node.js v24.22.1 và Go 1.26.2.

## Quyết định
Chọn **TypeScript trên nền tảng Node.js (>= 20, ESM)** làm ngôn ngữ triển khai chính, đóng gói bằng `tsup` ra tệp đơn `dist/index.js` và track sẵn `dist/` trong Git để hỗ trợ cài đặt trực tiếp qua `npm install -g github:<owner>/agy-tools` hoặc `npx github:<owner>/agy-tools` mà không cần bước build trên máy người dùng. Truy cập Windows Credential Manager thông qua PowerShell nhúng Win32 P/Invoke (`advapi32.dll`: `CredReadW` / `CredWriteW`) nhằm tránh phụ thuộc trình biên dịch C++ (`node-gyp`) khi cài đặt.

## Hệ quả
- **Tích cực:** Hệ sinh thái phong phú cho CLI (`commander`, `@inquirer/prompts`), xử lý JSON/YAML/Diff nhanh gọn, cài đặt trực tiếp từ GitHub không cần `devDependencies`.
- **Tiêu cực / Đánh đổi:** Trên Windows cần spawn tiến trình PowerShell khi đọc/ghi Credential Manager; yêu cầu máy đích cài sẵn Node.js >= 20; mỗi lần cập nhật `src/` cần chạy `npm run bundle` trước khi commit `dist/index.js` (không đặt tên script là `build`/`prepare` để tránh `pacote` kích hoạt `#prepareDir` gây lỗi Junction thiếu `dist/` khi chạy `npm i -g <git-url>` trên npm v11 Windows).
