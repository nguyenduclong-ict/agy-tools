# agy-tools

CLI toolkit for:
1. **Antigravity (`agy`) Auth Backup & Import** — export/import single-account OAuth credentials from the OS Keyring (`gemini:antigravity`) as a single JSON file, with optional AES-256-GCM encryption.
2. **Two-Way Agent Config Sync (`claude` ↔ `agy`)** — sync `agents`, `skills`, `rules`, `mcp`, `commands`, and `hooks` across `project` and `global` scopes with interactive selection, diff preview, and automatic `.bak` backups.

## Installation (Node.js >= 20)

```bash
# Install globally directly from GitHub
npm install -g github:<owner>/agy-tools

# Or run directly without global install
npx github:<owner>/agy-tools --help
```

## Usage

### Interactive Mode

```bash
agy-tools
```

### Auth Backup / Import / Status

```bash
# Check active agy authentication (without exposing tokens)
agy-tools auth status

# Export single-account JSON (plain)
agy-tools auth backup -o ./agy-auth.json

# Export encrypted with AES-256-GCM passphrase
agy-tools auth backup -o ./agy-auth.enc.json --encrypt

# Validate backup without modifying keyring
agy-tools auth import ./agy-auth.enc.json --dry-run

# Import into OS Keyring
agy-tools auth import ./agy-auth.enc.json
```

### Sync Agent Configs (`claude` ↔ `agy`)

```bash
# Interactive direction, scope, and category checkbox (defaults: agents, skills, rules)
agy-tools sync

# Non-interactive dry-run preview
agy-tools sync --from claude --to agy --mode project --categories agents,skills,rules,mcp --dry-run

# Apply sync (overwrites create .bak backups automatically unless --no-backup)
agy-tools sync --from claude --to agy --mode global --categories all --force
```

## Development

```bash
npm install
npm test
npm run typecheck
npm run build   # Always run before committing so dist/index.js stays updated
```
