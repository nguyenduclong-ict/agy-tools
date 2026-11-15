# Công Nghệ Sử Dụng (Tech Stack)

Tham khảo quyết định kiến trúc tại [ADR-001](../02_basic_design/decisions/ADR-001-tech-stack.md).

| Thành phần | Công nghệ / Thư viện | Phiên bản / Ghi chú |
| :--- | :--- | :--- |
| **Ngôn ngữ** | TypeScript | `^5.x` (`strict: true`) |
| **Runtime** | Node.js | `>= 20.0.0` (kiểm chứng trên `v24.22.1`) |
| **CLI Parser** | `commander` | Định nghĩa subcommands, flags, help tự động |
| **Interactive Prompts & Checkbox** | `@inquirer/prompts` | Cung cấp `checkbox`, `select`, `confirm`, `password`, `input` |
| **YAML Frontmatter** | `yaml` (hoặc `gray-matter`) | Parse/stringify YAML frontmatter cho Agents, Skills, Rules, Commands |
| **Mã hóa Auth** | `node:crypto` (built-in) | AES-256-GCM kết hợp KDF `crypto.scryptSync` |
| **Diff & Terminal UI** | `diff`, `picocolors`, `cli-table3` | Hiển thị preview diff xung đột và bảng báo cáo sync |
| **Windows Keyring Adapter** | PowerShell + Win32 `advapi32.dll` | Gọi `CredReadW` / `CredWriteW` không cần build native C++ addon |
| **macOS Keyring Adapter** | `/usr/bin/security` | Lệnh `find-generic-password` / `add-generic-password` |
| **Linux Keyring Adapter** | `secret-tool` (libsecret) + File Fallback | Đọc/ghi Secret Service; fallback `~/.gemini/antigravity-cli/antigravity-oauth-token` |
| **Build & Bundle** | `tsup` hoặc `tsc` | Biên dịch ESM kèm shebang `#!/usr/bin/env node` cho `npm`/`npx` |
| **Testing** | `vitest` | Unit test & integration test với temp filesystem và mock keyring adapter |
