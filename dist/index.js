#!/usr/bin/env node

// src/cli/index.ts
import fs10 from "fs";
import os4 from "os";
import path7 from "path";
import { Command } from "commander";
import pc3 from "picocolors";

// src/adapters/paths.ts
import fs from "fs";
import os from "os";
import path from "path";
function resolveProjectRoot(explicitDir, cwd = process.cwd()) {
  if (explicitDir) {
    return path.resolve(explicitDir);
  }
  let current = path.resolve(cwd);
  while (true) {
    if (fs.existsSync(path.join(current, ".git")) || fs.existsSync(path.join(current, ".claude")) || fs.existsSync(path.join(current, ".agents"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(cwd);
    }
    current = parent;
  }
}
function getClaudePaths(mode, rootOrHome = os.homedir()) {
  if (mode === "global") {
    const claudeDir2 = path.join(rootOrHome, ".claude");
    return {
      baseDir: claudeDir2,
      agentsDir: path.join(claudeDir2, "agents"),
      skillsDir: path.join(claudeDir2, "skills"),
      rootRuleFile: path.join(claudeDir2, "CLAUDE.md"),
      rulesDir: path.join(claudeDir2, "rules"),
      mcpFile: path.join(rootOrHome, ".claude.json"),
      commandsDir: path.join(claudeDir2, "commands"),
      hooksSettingsFile: path.join(claudeDir2, "settings.json")
    };
  }
  const claudeDir = path.join(rootOrHome, ".claude");
  return {
    baseDir: claudeDir,
    agentsDir: path.join(claudeDir, "agents"),
    skillsDir: path.join(claudeDir, "skills"),
    rootRuleFile: path.join(rootOrHome, "CLAUDE.md"),
    rulesDir: path.join(claudeDir, "rules"),
    mcpFile: path.join(rootOrHome, ".mcp.json"),
    commandsDir: path.join(claudeDir, "commands"),
    hooksSettingsFile: path.join(claudeDir, "settings.json")
  };
}
function getAntigravityPaths(mode, rootOrHome = os.homedir()) {
  if (mode === "global") {
    const configDir = path.join(rootOrHome, ".gemini", "config");
    return {
      baseDir: configDir,
      agentsDir: path.join(configDir, "agents"),
      skillsDir: path.join(configDir, "skills"),
      rootRuleFile: path.join(rootOrHome, ".gemini", "GEMINI.md"),
      fallbackRootRuleFile: null,
      rulesDir: path.join(configDir, "rules"),
      mcpFile: path.join(configDir, "mcp_config.json"),
      projectScopePluginJson: null,
      hooksFile: path.join(configDir, "hooks.json")
    };
  }
  const agentsRoot = path.join(rootOrHome, ".agents");
  const projectScopePluginDir = path.join(agentsRoot, "plugins", "project-scope");
  return {
    baseDir: agentsRoot,
    agentsDir: path.join(agentsRoot, "agents"),
    skillsDir: path.join(agentsRoot, "skills"),
    rootRuleFile: path.join(rootOrHome, "GEMINI.md"),
    fallbackRootRuleFile: path.join(rootOrHome, "AGENTS.md"),
    rulesDir: path.join(agentsRoot, "rules"),
    mcpFile: path.join(projectScopePluginDir, "mcp_config.json"),
    projectScopePluginJson: path.join(projectScopePluginDir, "plugin.json"),
    hooksFile: path.join(agentsRoot, "hooks.json")
  };
}

// src/adapters/types.ts
var ALL_SYNC_CATEGORIES = [
  "agents",
  "skills",
  "rules",
  "mcp",
  "commands",
  "hooks"
];
var DEFAULT_RECOMMENDED_CATEGORIES = [
  "agents",
  "skills",
  "rules"
];

// src/auth/service.ts
import fs4 from "fs";

// src/core/errors.ts
var ERROR_EXIT_CODES = {
  CLI_INVALID_ARGS: 1,
  AUTH_NOT_FOUND: 2,
  AUTH_INVALID_FORMAT: 3,
  AUTH_KEYRING_UNAVAILABLE: 4,
  CRYPTO_DECRYPT_FAILED: 5,
  SYNC_SOURCE_NOT_FOUND: 6,
  SYNC_CONFLICT_ABORTED: 7,
  FS_PERMISSION_DENIED: 8
};
var AppError = class extends Error {
  code;
  exitCode;
  constructor(code, message, cause) {
    super(message, cause !== void 0 ? { cause } : void 0);
    this.name = "AppError";
    this.code = code;
    this.exitCode = ERROR_EXIT_CODES[code];
  }
};
function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    const code = err.code;
    if (code === "EACCES" || code === "EPERM") {
      return new AppError("FS_PERMISSION_DENIED", err.message, err);
    }
    return new AppError("CLI_INVALID_ARGS", err.message, err);
  }
  return new AppError("CLI_INVALID_ARGS", String(err));
}

// src/core/fs-atomic.ts
import crypto from "crypto";
import fs2 from "fs";
import path2 from "path";
function ensureDir(dirPath, mode) {
  fs2.mkdirSync(dirPath, { recursive: true, ...mode !== void 0 ? { mode } : {} });
}
function writeFileAtomic(targetPath, content, options = {}) {
  const dir = path2.dirname(targetPath);
  ensureDir(dir);
  const tmpName = `.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  const tmpPath = path2.join(dir, tmpName);
  try {
    fs2.writeFileSync(tmpPath, content, options.mode !== void 0 ? { mode: options.mode } : void 0);
    fs2.renameSync(tmpPath, targetPath);
    if (options.mode !== void 0 && process.platform !== "win32") {
      fs2.chmodSync(targetPath, options.mode);
    }
  } catch (err) {
    if (fs2.existsSync(tmpPath)) {
      fs2.rmSync(tmpPath, { force: true });
    }
    const code = err?.code;
    if (code === "EACCES" || code === "EPERM") {
      throw new AppError("FS_PERMISSION_DENIED", `Permission denied writing ${targetPath}`, err);
    }
    throw err;
  }
}
function readJsonIfExists(filePath) {
  if (!fs2.existsSync(filePath)) {
    return null;
  }
  const raw = fs2.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
function createBackupFile(targetPath, now = /* @__PURE__ */ new Date()) {
  if (!fs2.existsSync(targetPath)) {
    return null;
  }
  let backupPath = `${targetPath}.bak`;
  if (fs2.existsSync(backupPath)) {
    backupPath = `${targetPath}.bak.${formatTimestamp(now)}`;
    let counter = 1;
    while (fs2.existsSync(backupPath)) {
      backupPath = `${targetPath}.bak.${formatTimestamp(now)}-${counter}`;
      counter += 1;
    }
  }
  fs2.copyFileSync(targetPath, backupPath);
  return backupPath;
}
function sha256Normalized(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}
function listFilesRecursive(rootDir) {
  if (!fs2.existsSync(rootDir)) {
    return [];
  }
  const results = [];
  const walk = (current, relBase) => {
    const entries = fs2.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path2.join(current, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      const isDir = entry.isDirectory() || entry.isSymbolicLink() && fs2.statSync(fullPath).isDirectory();
      const isFile = entry.isFile() || entry.isSymbolicLink() && fs2.statSync(fullPath).isFile();
      if (isDir) {
        walk(fullPath, relPath);
      } else if (isFile) {
        results.push(relPath);
      }
    }
  };
  walk(rootDir, "");
  return results.sort();
}

// src/auth/crypto.ts
import crypto2 from "crypto";
var SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 32
};
function encryptCredential(plaintextJson, passphrase) {
  if (!passphrase) {
    throw new AppError("CLI_INVALID_ARGS", "Passphrase must not be empty when encrypting.");
  }
  const salt = crypto2.randomBytes(16);
  const iv = crypto2.randomBytes(12);
  const key = crypto2.scryptSync(passphrase, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });
  const cipher = crypto2.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextJson, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    crypto: {
      cipher: "aes-256-gcm",
      kdf: "scrypt",
      kdfParams: { ...SCRYPT_PARAMS },
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64")
    },
    ciphertext: encrypted.toString("base64")
  };
}
function decryptCredential(ciphertextB64, meta, passphrase) {
  if (!passphrase) {
    throw new AppError("CRYPTO_DECRYPT_FAILED", "Passphrase is required to decrypt this backup.");
  }
  if (meta.cipher !== "aes-256-gcm" || meta.kdf !== "scrypt") {
    throw new AppError("AUTH_INVALID_FORMAT", `Unsupported encryption metadata: ${meta.cipher}/${meta.kdf}`);
  }
  try {
    const salt = Buffer.from(meta.salt, "base64");
    const iv = Buffer.from(meta.iv, "base64");
    const tag = Buffer.from(meta.tag, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");
    const { N, r, p, keyLen } = meta.kdfParams;
    const key = crypto2.scryptSync(passphrase, salt, keyLen, { N, r, p });
    const decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    throw new AppError(
      "CRYPTO_DECRYPT_FAILED",
      "Failed to decrypt auth backup. Verify your passphrase and file integrity.",
      err
    );
  }
}

// src/auth/jwt.ts
function extractEmailFromIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return null;
  }
  const parts = idToken.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof payload.email === "string" && payload.email.length > 0 ? payload.email : null;
  } catch {
    return null;
  }
}
function extractAccountMeta(credential) {
  const email = extractEmailFromIdToken(credential.id_token);
  const authMethod = typeof credential.auth_method === "string" ? credential.auth_method : null;
  const expiry = typeof credential.token?.expiry === "string" ? credential.token.expiry : null;
  return { email, authMethod, expiry };
}

// src/auth/keyring/index.ts
import os3 from "os";

// src/auth/keyring/file-fallback.ts
import fs3 from "fs";
import os2 from "os";
import path3 from "path";
var FileFallbackKeyringAdapter = class {
  sourceKind = "file-fallback";
  tokenPath;
  constructor(homeDir = os2.homedir()) {
    this.tokenPath = path3.join(homeDir, ".gemini", "antigravity-cli", "antigravity-oauth-token");
  }
  async isAvailable() {
    return true;
  }
  async read() {
    if (!fs3.existsSync(this.tokenPath)) {
      return null;
    }
    const content = fs3.readFileSync(this.tokenPath, "utf8").trim();
    return content.length > 0 ? content : null;
  }
  async write(payloadUtf8) {
    ensureDir(path3.dirname(this.tokenPath), 448);
    writeFileAtomic(this.tokenPath, payloadUtf8, { mode: 384 });
  }
};

// src/auth/keyring/linux.ts
import { execFile, spawn } from "child_process";
import { promisify } from "util";

// src/auth/keyring/types.ts
var KEYRING_SERVICE = "gemini";
var KEYRING_ACCOUNT = "antigravity";
var WINDOWS_CRED_TARGET = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;

// src/auth/keyring/linux.ts
var execFileAsync = promisify(execFile);
var LinuxKeyringAdapter = class {
  sourceKind = "keyring";
  async isAvailable() {
    if (process.platform !== "linux" || !process.env.DBUS_SESSION_BUS_ADDRESS) {
      return false;
    }
    try {
      await execFileAsync("which", ["secret-tool"]);
      return true;
    } catch {
      return false;
    }
  }
  async read() {
    try {
      const { stdout } = await execFileAsync(
        "secret-tool",
        ["lookup", "service", KEYRING_SERVICE, "account", KEYRING_ACCOUNT],
        { encoding: "utf8" }
      );
      const trimmed = stdout.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (err) {
      const exitCode = err?.code;
      if (exitCode === 1) {
        return null;
      }
      throw new AppError(
        "AUTH_KEYRING_UNAVAILABLE",
        `Linux Secret Service read failed: ${err.message}`,
        err
      );
    }
  }
  async write(payloadUtf8) {
    await new Promise((resolve, reject) => {
      const child = spawn(
        "secret-tool",
        ["store", `--label=${WINDOWS_CRED_TARGET}`, "service", KEYRING_SERVICE, "account", KEYRING_ACCOUNT],
        { stdio: ["pipe", "pipe", "pipe"] }
      );
      const stderr = [];
      child.stderr.on("data", (d) => stderr.push(d));
      child.on("error", (err) => {
        reject(new AppError("AUTH_KEYRING_UNAVAILABLE", `Linux Secret Service write failed: ${err.message}`, err));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new AppError(
              "AUTH_KEYRING_UNAVAILABLE",
              `Linux Secret Service write failed: ${Buffer.concat(stderr).toString("utf8").trim()}`
            )
          );
        }
      });
      child.stdin.write(payloadUtf8, "utf8");
      child.stdin.end();
    });
  }
};

// src/auth/keyring/macos.ts
import { execFile as execFile2 } from "child_process";
import { promisify as promisify2 } from "util";
var execFileAsync2 = promisify2(execFile2);
var MacosKeyringAdapter = class {
  sourceKind = "keyring";
  async isAvailable() {
    return process.platform === "darwin";
  }
  async read() {
    try {
      const { stdout } = await execFileAsync2(
        "/usr/bin/security",
        ["find-generic-password", "-s", KEYRING_SERVICE, "-a", KEYRING_ACCOUNT, "-w"],
        { encoding: "utf8" }
      );
      return stdout.trim();
    } catch (err) {
      const exitCode = err?.code;
      if (exitCode === 44) {
        return null;
      }
      throw new AppError(
        "AUTH_KEYRING_UNAVAILABLE",
        `macOS Keychain read failed: ${err.message}`,
        err
      );
    }
  }
  async write(payloadUtf8) {
    try {
      await execFileAsync2(
        "/usr/bin/security",
        ["add-generic-password", "-U", "-s", KEYRING_SERVICE, "-a", KEYRING_ACCOUNT, "-w", payloadUtf8],
        { encoding: "utf8" }
      );
    } catch (err) {
      throw new AppError(
        "AUTH_KEYRING_UNAVAILABLE",
        `macOS Keychain write failed: ${err.message}`,
        err
      );
    }
  }
};

// src/auth/keyring/windows.ts
import { spawn as spawn2 } from "child_process";
var WIN32_CSHARP = `
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AgyCredStore {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredWrite([In] ref CREDENTIAL userCredential, uint flags);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr cred);

    public static string ReadUtf8(string target) {
        IntPtr credPtr;
        if (!CredRead(target, 1, 0, out credPtr)) {
            int err = Marshal.GetLastWin32Error();
            if (err == 1168) return null;
            throw new InvalidOperationException("CredRead failed with Win32 error " + err);
        }
        try {
            CREDENTIAL cred = Marshal.PtrToStructure<CREDENTIAL>(credPtr);
            byte[] bytes = new byte[cred.CredentialBlobSize];
            if (cred.CredentialBlobSize > 0) {
                Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
            }
            return Encoding.UTF8.GetString(bytes);
        } finally {
            CredFree(credPtr);
        }
    }

    public static void WriteUtf8(string target, string user, string secret) {
        byte[] bytes = Encoding.UTF8.GetBytes(secret);
        IntPtr blobPtr = Marshal.AllocCoTaskMem(bytes.Length);
        try {
            Marshal.Copy(bytes, 0, blobPtr, bytes.Length);
            CREDENTIAL cred = new CREDENTIAL();
            cred.Type = 1;
            cred.TargetName = target;
            cred.UserName = user;
            cred.Persist = 2;
            cred.CredentialBlobSize = (uint)bytes.Length;
            cred.CredentialBlob = blobPtr;
            if (!CredWrite(ref cred, 0)) {
                int err = Marshal.GetLastWin32Error();
                throw new InvalidOperationException("CredWrite failed with Win32 error " + err);
            }
        } finally {
            Marshal.ZeroFreeCoTaskMemUnicode(blobPtr);
        }
    }
}
`;
function runPowerShell(script, extraEnv = {}) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return new Promise((resolve, reject) => {
    const child = spawn2(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...extraEnv },
        windowsHide: true
      }
    );
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (d) => stdoutChunks.push(d));
    child.stderr.on("data", (d) => stderrChunks.push(d));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8")
      });
    });
  });
}
var WindowsKeyringAdapter = class {
  sourceKind = "keyring";
  async isAvailable() {
    return process.platform === "win32";
  }
  async read() {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
${WIN32_CSHARP}
'@
$val = [AgyCredStore]::ReadUtf8('${WINDOWS_CRED_TARGET}')
if ($null -eq $val) {
  Write-Output '__AGY_NOT_FOUND__'
} else {
  $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($val))
  Write-Output "__AGY_B64__:$b64"
}
`;
    const res = await runPowerShell(script);
    if (res.code !== 0) {
      throw new AppError("AUTH_KEYRING_UNAVAILABLE", `Windows Credential Manager read failed: ${res.stderr.trim()}`);
    }
    const line = res.stdout.trim();
    if (line === "__AGY_NOT_FOUND__") {
      return null;
    }
    if (line.startsWith("__AGY_B64__:")) {
      const b64 = line.slice("__AGY_B64__:".length);
      return Buffer.from(b64, "base64").toString("utf8");
    }
    throw new AppError("AUTH_KEYRING_UNAVAILABLE", "Unexpected output from Windows Credential Manager.");
  }
  async write(payloadUtf8) {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
${WIN32_CSHARP}
'@
$payload = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:AGY_TOOLS_CRED_B64))
[AgyCredStore]::WriteUtf8('${WINDOWS_CRED_TARGET}', '${KEYRING_ACCOUNT}', $payload)
`;
    const b64 = Buffer.from(payloadUtf8, "utf8").toString("base64");
    const res = await runPowerShell(script, { AGY_TOOLS_CRED_B64: b64 });
    if (res.code !== 0) {
      throw new AppError("AUTH_KEYRING_UNAVAILABLE", `Windows Credential Manager write failed: ${res.stderr.trim()}`);
    }
  }
};

// src/auth/keyring/index.ts
function getNativeAdapter() {
  switch (process.platform) {
    case "win32":
      return new WindowsKeyringAdapter();
    case "darwin":
      return new MacosKeyringAdapter();
    case "linux":
      return new LinuxKeyringAdapter();
    default:
      return null;
  }
}
async function resolveKeyringAdapter(options = {}) {
  const homeDir = options.homeDir ?? os3.homedir();
  const fallback = new FileFallbackKeyringAdapter(homeDir);
  if (options.fileFallback) {
    return fallback;
  }
  const native = getNativeAdapter();
  if (native && await native.isAvailable()) {
    return native;
  }
  return fallback;
}
async function readCredentialWithFallback(options = {}) {
  const homeDir = options.homeDir ?? os3.homedir();
  const fallback = new FileFallbackKeyringAdapter(homeDir);
  if (options.fileFallback) {
    const raw = await fallback.read();
    return raw ? { rawJson: raw, adapter: fallback } : null;
  }
  const native = getNativeAdapter();
  if (native && await native.isAvailable()) {
    try {
      const raw = await native.read();
      if (raw) {
        return { rawJson: raw, adapter: native };
      }
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== "AUTH_KEYRING_UNAVAILABLE") {
        throw err;
      }
    }
  }
  const fallbackRaw = await fallback.read();
  return fallbackRaw ? { rawJson: fallbackRaw, adapter: fallback } : null;
}

// src/auth/validation.ts
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function validateRawCredential(input2) {
  if (!isRecord(input2)) {
    throw new AppError("AUTH_INVALID_FORMAT", "Credential payload must be a JSON object.");
  }
  if (!isRecord(input2.token)) {
    throw new AppError("AUTH_INVALID_FORMAT", 'Credential payload is missing the "token" object.');
  }
  const hasRefresh = typeof input2.token.refresh_token === "string" && input2.token.refresh_token.length > 0;
  const hasAccess = typeof input2.token.access_token === "string" && input2.token.access_token.length > 0;
  if (!hasRefresh && !hasAccess) {
    throw new AppError(
      "AUTH_INVALID_FORMAT",
      'Credential "token" must contain a non-empty "refresh_token" or "access_token".'
    );
  }
  if (typeof input2.auth_method !== "string" || input2.auth_method.trim().length === 0) {
    throw new AppError("AUTH_INVALID_FORMAT", 'Credential payload is missing a valid "auth_method" string.');
  }
  return input2;
}
function validateCryptoMeta(input2) {
  if (!isRecord(input2)) {
    throw new AppError("AUTH_INVALID_FORMAT", 'Encrypted backup is missing "crypto" metadata.');
  }
  if (typeof input2.cipher !== "string" || typeof input2.kdf !== "string" || !isRecord(input2.kdfParams) || typeof input2.salt !== "string" || typeof input2.iv !== "string" || typeof input2.tag !== "string") {
    throw new AppError("AUTH_INVALID_FORMAT", 'Encrypted backup has malformed "crypto" metadata.');
  }
  return input2;
}
function parseBackupInput(rawJsonText) {
  let parsed;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err) {
    throw new AppError("AUTH_INVALID_FORMAT", "Input file is not valid JSON.", err);
  }
  if (!isRecord(parsed)) {
    throw new AppError("AUTH_INVALID_FORMAT", "Auth backup JSON root must be an object.");
  }
  if (parsed.format === "agy-tools-auth") {
    if (parsed.version !== 1) {
      throw new AppError("AUTH_INVALID_FORMAT", `Unsupported backup version: ${String(parsed.version)}`);
    }
    if (parsed.encrypted === true) {
      if (typeof parsed.ciphertext !== "string" || parsed.ciphertext.length === 0) {
        throw new AppError("AUTH_INVALID_FORMAT", 'Encrypted backup is missing "ciphertext".');
      }
      validateCryptoMeta(parsed.crypto);
      return {
        kind: "encrypted-envelope",
        envelope: parsed
      };
    }
    if (parsed.encrypted === false) {
      validateRawCredential(parsed.credential);
      return {
        kind: "plain-envelope",
        envelope: parsed
      };
    }
    throw new AppError("AUTH_INVALID_FORMAT", 'Backup envelope must specify boolean "encrypted".');
  }
  const credential = validateRawCredential(parsed);
  return {
    kind: "raw-credential",
    credential
  };
}

// src/auth/service.ts
function parseRawCredentialText(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new AppError("AUTH_INVALID_FORMAT", "Stored agy credential is not valid JSON.", err);
  }
  return validateRawCredential(parsed);
}
async function getAuthStatus(opts = {}, deps = {}) {
  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const found = await reader({ fileFallback: opts.fileFallback });
  if (!found) {
    return { authenticated: false, source: null, account: null };
  }
  const credential = parseRawCredentialText(found.rawJson);
  return {
    authenticated: true,
    source: found.adapter.sourceKind,
    account: extractAccountMeta(credential)
  };
}
async function backupAuth(options, deps = {}) {
  if (!options.force && fs4.existsSync(options.outputPath)) {
    throw new AppError(
      "CLI_INVALID_ARGS",
      `Output file already exists: ${options.outputPath}. Pass --force to overwrite.`
    );
  }
  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const found = await reader({ fileFallback: options.fileFallback });
  if (!found) {
    throw new AppError(
      "AUTH_NOT_FOUND",
      "No active agy credential found in OS Keyring or fallback token file."
    );
  }
  const credential = parseRawCredentialText(found.rawJson);
  const account = extractAccountMeta(credential);
  const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
  let envelope;
  if (options.encrypt) {
    if (!options.passphrase) {
      throw new AppError("CLI_INVALID_ARGS", "Passphrase is required when --encrypt is enabled.");
    }
    const encrypted = encryptCredential(JSON.stringify(credential), options.passphrase);
    envelope = {
      format: "agy-tools-auth",
      version: 1,
      exportedAt,
      account,
      encrypted: true,
      crypto: encrypted.crypto,
      ciphertext: encrypted.ciphertext
    };
  } else {
    envelope = {
      format: "agy-tools-auth",
      version: 1,
      exportedAt,
      account,
      encrypted: false,
      credential
    };
  }
  writeFileAtomic(options.outputPath, `${JSON.stringify(envelope, null, 2)}
`, { mode: 384 });
  return {
    outputPath: options.outputPath,
    encrypted: Boolean(options.encrypt),
    source: found.adapter.sourceKind,
    account
  };
}
function inspectImportFile(inputPath) {
  if (!fs4.existsSync(inputPath)) {
    throw new AppError("AUTH_NOT_FOUND", `Backup file not found: ${inputPath}`);
  }
  const rawText = fs4.readFileSync(inputPath, "utf8");
  const parsed = parseBackupInput(rawText);
  if (parsed.kind === "encrypted-envelope") {
    const env = parsed.envelope;
    return {
      encrypted: true,
      account: env.account ?? null,
      resolveCredential: (passphrase) => {
        const plainText = decryptCredential(env.ciphertext, env.crypto, passphrase ?? "");
        const credential2 = parseRawCredentialText(plainText);
        return { credential: credential2, account: extractAccountMeta(credential2) };
      }
    };
  }
  if (parsed.kind === "plain-envelope") {
    const credential2 = parsed.envelope.credential;
    const account2 = extractAccountMeta(credential2);
    return {
      encrypted: false,
      account: account2,
      resolveCredential: () => ({ credential: credential2, account: account2 })
    };
  }
  const credential = parsed.credential;
  const account = extractAccountMeta(credential);
  return {
    encrypted: false,
    account,
    resolveCredential: () => ({ credential, account })
  };
}
async function applyImportedCredential(credential, options = {}, deps = {}) {
  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const writerFactory = deps.resolveWriter ?? ((o) => resolveKeyringAdapter(o));
  const existing = await reader({ fileFallback: options.fileFallback });
  let previousAccount = null;
  if (existing) {
    try {
      previousAccount = extractAccountMeta(parseRawCredentialText(existing.rawJson));
    } catch {
      previousAccount = null;
    }
  }
  const importedAccount = extractAccountMeta(credential);
  const adapter = await writerFactory({ fileFallback: options.fileFallback });
  if (!options.dryRun) {
    await adapter.write(JSON.stringify(credential));
  }
  return {
    applied: !options.dryRun,
    targetSource: adapter.sourceKind,
    previousAccount,
    importedAccount
  };
}

// src/sync/runner.ts
import fs9 from "fs";

// src/adapters/antigravity.ts
import fs6 from "fs";
import path5 from "path";

// src/core/frontmatter.ts
import YAML from "yaml";
var FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const match = FRONTMATTER_REGEX.exec(normalized);
  if (!match) {
    return {
      data: {},
      body: normalized,
      hasFrontmatter: false
    };
  }
  const yamlSource = match[1] ?? "";
  let parsed = {};
  if (yamlSource.trim().length > 0) {
    parsed = YAML.parse(yamlSource);
  }
  const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  const body = normalized.slice(match[0].length);
  return {
    data,
    body,
    hasFrontmatter: true
  };
}
function stringifyFrontmatter(data, body) {
  const cleanEntries = Object.entries(data).filter(([, value]) => value !== void 0);
  const normalizedBody = body.replace(/^\r?\n+/, "");
  if (cleanEntries.length === 0) {
    return normalizedBody.endsWith("\n") || normalizedBody.length === 0 ? normalizedBody : `${normalizedBody}
`;
  }
  const cleanObj = Object.fromEntries(cleanEntries);
  const yamlText = YAML.stringify(cleanObj, { lineWidth: 0 }).trimEnd();
  const bodyOut = normalizedBody.length > 0 ? `
${normalizedBody}` : "";
  const result = `---
${yamlText}
---
${bodyOut}`;
  return result.endsWith("\n") ? result : `${result}
`;
}
function extractFirstParagraph(body, maxLen = 160) {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("```"));
  const first = lines[0] ?? "";
  if (first.length <= maxLen) {
    return first;
  }
  return `${first.slice(0, maxLen - 3).trimEnd()}...`;
}

// src/converters/tools-map.ts
var CLAUDE_TO_AGY_TOOLS = {
  Read: ["read_file"],
  Glob: ["read_file"],
  Grep: ["read_file"],
  Edit: ["edit_file"],
  MultiEdit: ["edit_file"],
  Write: ["write_file"],
  Bash: ["run_command", "manage_task"],
  WebSearch: ["search_web"],
  WebFetch: ["search_web"]
};
var AGY_TO_CLAUDE_TOOLS = {
  read_file: ["Read", "Grep", "Glob"],
  edit_file: ["Edit"],
  write_file: ["Write"],
  run_command: ["Bash"],
  search_web: ["WebSearch", "WebFetch"]
};
var AGY_ALL_DEFAULT_TOOLS = [
  "read_file",
  "edit_file",
  "write_file",
  "run_command",
  "manage_task",
  "search_web"
];
function parseToolList(raw) {
  if (raw === void 0 || raw === null) {
    return null;
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? items : [];
  }
  return null;
}
function mapClaudeToolsToAgy(claudeTools) {
  if (claudeTools === null) {
    return { mapped: [...AGY_ALL_DEFAULT_TOOLS], unmapped: [] };
  }
  const out = /* @__PURE__ */ new Set();
  const unmapped = [];
  for (const tool of claudeTools) {
    const targets = CLAUDE_TO_AGY_TOOLS[tool];
    if (targets) {
      for (const t of targets) {
        out.add(t);
      }
    } else {
      unmapped.push(tool);
    }
  }
  return { mapped: Array.from(out), unmapped };
}
function mapAgyToolsToClaude(agyTools) {
  if (agyTools === null) {
    return { mapped: null, unmapped: [] };
  }
  const out = /* @__PURE__ */ new Set();
  const unmapped = [];
  for (const tool of agyTools) {
    const targets = AGY_TO_CLAUDE_TOOLS[tool];
    if (targets) {
      for (const t of targets) {
        out.add(t);
      }
    } else {
      unmapped.push(tool);
    }
  }
  return { mapped: Array.from(out), unmapped };
}
function translateHookMatcher(matcher, direction) {
  if (!matcher || matcher === "*") {
    return matcher ?? "*";
  }
  const parts = matcher.split("|").map((p) => p.trim()).filter(Boolean);
  const translated = /* @__PURE__ */ new Set();
  for (const part of parts) {
    if (direction === "claude-to-agy") {
      const mapped = CLAUDE_TO_AGY_TOOLS[part];
      if (mapped && mapped[0]) {
        translated.add(mapped[0]);
      } else {
        translated.add(part);
      }
    } else {
      const mapped = AGY_TO_CLAUDE_TOOLS[part];
      if (mapped) {
        for (const m of mapped) {
          translated.add(m);
        }
      } else {
        translated.add(part);
      }
    }
  }
  return Array.from(translated).join("|");
}

// src/converters/agents.ts
var CLAUDE_DROPPED_FIELDS = ["model", "color", "permissionMode", "maxTurns", "disallowedTools"];
function convertAgentToAgy(agent) {
  const issues = [];
  const parsed = parseFrontmatter(agent.rawContent);
  const name = typeof parsed.data.name === "string" && parsed.data.name.trim() ? parsed.data.name.trim() : agent.slug;
  let description = typeof parsed.data.description === "string" && parsed.data.description.trim() ? parsed.data.description.trim() : extractFirstParagraph(parsed.body);
  if (!description) {
    description = `Subagent ${name} synced from Claude Code.`;
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: "Missing description in source agent; generated fallback description."
    });
  }
  const rawTools = parseToolList(parsed.data.tools);
  const { mapped, unmapped } = mapClaudeToolsToAgy(rawTools);
  if (unmapped.length > 0) {
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: `Skipped unmapped Claude tools: ${unmapped.join(", ")}`
    });
  }
  const dropped = [];
  for (const field of CLAUDE_DROPPED_FIELDS) {
    if (parsed.data[field] !== void 0) {
      dropped.push(field);
    }
  }
  if (dropped.length > 0) {
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: `Dropped Claude-specific frontmatter fields: ${dropped.join(", ")}`
    });
  }
  const targetFm = {
    name,
    description,
    subagent: true,
    mainAgent: false,
    tools: mapped
  };
  return {
    content: stringifyFrontmatter(targetFm, parsed.body),
    issues
  };
}
function convertAgentToClaude(agent) {
  const issues = [];
  const parsed = parseFrontmatter(agent.rawContent);
  const name = typeof parsed.data.name === "string" && parsed.data.name.trim() ? parsed.data.name.trim() : agent.slug;
  let description = typeof parsed.data.description === "string" && parsed.data.description.trim() ? parsed.data.description.trim() : extractFirstParagraph(parsed.body);
  if (!description) {
    description = `Subagent ${name} synced from Antigravity.`;
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: "Missing description in source agent; generated fallback description."
    });
  }
  const rawTools = parseToolList(parsed.data.tools);
  const { mapped, unmapped } = mapAgyToolsToClaude(rawTools);
  if (unmapped.length > 0) {
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: `Skipped Antigravity-only tools: ${unmapped.join(", ")}`
    });
  }
  if (typeof parsed.data.model === "string" && parsed.data.model.toLowerCase().includes("gemini")) {
    issues.push({
      category: "agents",
      item: agent.slug,
      severity: "warning",
      reason: `Dropped Antigravity model "${parsed.data.model}" when syncing to Claude Code.`
    });
  }
  const targetFm = {
    name,
    description
  };
  if (mapped !== null && mapped.length > 0) {
    targetFm.tools = mapped.join(", ");
  }
  return {
    content: stringifyFrontmatter(targetFm, parsed.body),
    issues
  };
}

// src/converters/hooks.ts
var SUPPORTED_EVENTS = /* @__PURE__ */ new Set(["SessionStart", "PreToolUse", "PostToolUse", "Stop"]);
var TOOL_SCOPED_EVENTS = /* @__PURE__ */ new Set(["PreToolUse", "PostToolUse"]);
function isRecord2(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function convertHooksToAgy(claudeHooks) {
  const issues = [];
  if (!isRecord2(claudeHooks)) {
    return { hooksJson: {}, issues };
  }
  const syncedGroup = {};
  for (const [eventName, entries] of Object.entries(claudeHooks)) {
    if (!SUPPORTED_EVENTS.has(eventName)) {
      issues.push({
        category: "hooks",
        item: eventName,
        severity: "skipped",
        reason: `Claude hook event "${eventName}" has no Antigravity equivalent.`
      });
      continue;
    }
    if (!Array.isArray(entries)) {
      continue;
    }
    const outEntries = [];
    for (const entry of entries) {
      if (!isRecord2(entry)) continue;
      const matcher = typeof entry.matcher === "string" ? entry.matcher : void 0;
      const rawHandlers = Array.isArray(entry.hooks) ? entry.hooks : [];
      const commandHandlers = [];
      for (const h of rawHandlers) {
        if (!isRecord2(h)) continue;
        const hType = typeof h.type === "string" ? h.type : "command";
        if (hType !== "command" || typeof h.command !== "string") {
          issues.push({
            category: "hooks",
            item: eventName,
            severity: "skipped",
            reason: `Skipped non-command hook handler (type="${hType}").`
          });
          continue;
        }
        commandHandlers.push({
          type: "command",
          command: h.command,
          ...typeof h.timeout === "number" ? { timeout: h.timeout } : {}
        });
      }
      if (commandHandlers.length === 0) continue;
      if (TOOL_SCOPED_EVENTS.has(eventName)) {
        outEntries.push({
          matcher: translateHookMatcher(matcher, "claude-to-agy"),
          hooks: commandHandlers
        });
      } else {
        outEntries.push(...commandHandlers);
      }
    }
    if (outEntries.length > 0) {
      syncedGroup[eventName] = outEntries;
    }
  }
  if (Object.keys(syncedGroup).length === 0) {
    return { hooksJson: {}, issues };
  }
  return {
    hooksJson: { "synced-from-claude": syncedGroup },
    issues
  };
}
function convertHooksToClaude(agyHooks) {
  const issues = [];
  if (!isRecord2(agyHooks)) {
    return { claudeHooks: {}, issues };
  }
  const out = {};
  for (const [groupName, groupSpec] of Object.entries(agyHooks)) {
    if (!isRecord2(groupSpec)) continue;
    if (groupSpec.enabled === false) {
      issues.push({
        category: "hooks",
        item: groupName,
        severity: "skipped",
        reason: `Disabled Antigravity hook group "${groupName}" was skipped.`
      });
      continue;
    }
    for (const [eventName, entries] of Object.entries(groupSpec)) {
      if (eventName === "enabled") continue;
      if (!SUPPORTED_EVENTS.has(eventName)) {
        issues.push({
          category: "hooks",
          item: `${groupName}.${eventName}`,
          severity: "skipped",
          reason: `Antigravity hook event "${eventName}" has no Claude Code equivalent.`
        });
        continue;
      }
      if (!Array.isArray(entries)) continue;
      const targetList = out[eventName] ??= [];
      if (TOOL_SCOPED_EVENTS.has(eventName)) {
        for (const entry of entries) {
          if (!isRecord2(entry)) continue;
          const matcher = typeof entry.matcher === "string" ? entry.matcher : "*";
          const handlers = Array.isArray(entry.hooks) ? entry.hooks : [];
          const mappedHandlers = handlers.filter((h) => isRecord2(h) && typeof h.command === "string").map((h) => ({
            type: "command",
            command: h.command,
            ...typeof h.timeout === "number" ? { timeout: h.timeout } : {}
          }));
          if (mappedHandlers.length > 0) {
            targetList.push({
              matcher: translateHookMatcher(matcher, "agy-to-claude"),
              hooks: mappedHandlers
            });
          }
        }
      } else {
        const mappedHandlers = entries.filter((h) => isRecord2(h) && typeof h.command === "string").map((h) => ({
          type: "command",
          command: h.command,
          ...typeof h.timeout === "number" ? { timeout: h.timeout } : {}
        }));
        if (mappedHandlers.length > 0) {
          targetList.push({ hooks: mappedHandlers });
        }
      }
    }
  }
  return { claudeHooks: out, issues };
}

// src/converters/mcp.ts
var ANTIGRAVITY_ALLOWED_MCP_KEYS = /* @__PURE__ */ new Set([
  "command",
  "args",
  "env",
  "cwd",
  "url",
  "headers",
  "disabled",
  "variables"
]);
function convertMcpToAgy(servers) {
  const result = {};
  const issues = [];
  for (const [name, raw] of Object.entries(servers)) {
    const type = typeof raw.type === "string" ? raw.type : void 0;
    const url = typeof raw.url === "string" ? raw.url : void 0;
    if (type === "sse" || url && url.endsWith("/sse")) {
      issues.push({
        category: "mcp",
        item: name,
        severity: "skipped",
        reason: "Legacy SSE transport is not supported by Antigravity; wrap with mcp-remote stdio bridge if needed."
      });
      continue;
    }
    const clean = {};
    for (const [k, v] of Object.entries(raw)) {
      if (ANTIGRAVITY_ALLOWED_MCP_KEYS.has(k)) {
        clean[k] = v;
      }
    }
    if (!clean.command && !clean.url) {
      issues.push({
        category: "mcp",
        item: name,
        severity: "skipped",
        reason: 'MCP server lacks both "command" and "url".'
      });
      continue;
    }
    result[name] = clean;
  }
  return { servers: result, issues };
}
function convertMcpToClaude(servers) {
  const result = {};
  const issues = [];
  for (const [name, raw] of Object.entries(servers)) {
    const clean = { ...raw };
    if (typeof clean.serverUrl === "string" && !clean.url) {
      clean.url = clean.serverUrl;
      delete clean.serverUrl;
    }
    if (typeof clean.url === "string" && !clean.type) {
      clean.type = "http";
    }
    if (Array.isArray(clean.variables) && clean.variables.length > 0) {
      issues.push({
        category: "mcp",
        item: name,
        severity: "warning",
        reason: 'Server uses Antigravity plugin "variables"; ensure matching OS env vars are set when running Claude Code.'
      });
      delete clean.variables;
    }
    delete clean.disabled;
    result[name] = clean;
  }
  return { servers: result, issues };
}

// src/converters/rules.ts
var ANTIGRAVITY_RULE_MAX_BYTES = 24e3;
function convertRootRule(rawContent, direction, itemLabel) {
  const issues = [];
  if (direction === "claude-to-agy" && Buffer.byteLength(rawContent, "utf8") > ANTIGRAVITY_RULE_MAX_BYTES) {
    issues.push({
      category: "rules",
      item: itemLabel,
      severity: "warning",
      reason: `File exceeds Antigravity's 24,000-byte per-file rule cap (${Buffer.byteLength(rawContent, "utf8")} bytes) and may be truncated at runtime.`
    });
  }
  return { content: rawContent, issues };
}
function convertModularRuleToAgy(rule) {
  const issues = [];
  const parsed = parseFrontmatter(rule.rawContent);
  let globsStr;
  if (Array.isArray(parsed.data.paths)) {
    globsStr = parsed.data.paths.map((p) => String(p).trim()).filter(Boolean).join(", ");
  } else if (typeof parsed.data.paths === "string" && parsed.data.paths.trim()) {
    globsStr = parsed.data.paths.trim();
  }
  const targetFm = globsStr ? { trigger: "glob", globs: globsStr } : { trigger: "always_on" };
  const out = stringifyFrontmatter(targetFm, parsed.body);
  if (Buffer.byteLength(out, "utf8") > ANTIGRAVITY_RULE_MAX_BYTES) {
    issues.push({
      category: "rules",
      item: rule.name,
      severity: "warning",
      reason: `Rule exceeds Antigravity's 24,000-byte cap (${Buffer.byteLength(out, "utf8")} bytes).`
    });
  }
  return { content: out, issues };
}
function convertModularRuleToClaude(rule) {
  const issues = [];
  const parsed = parseFrontmatter(rule.rawContent);
  const trigger = typeof parsed.data.trigger === "string" ? parsed.data.trigger : "always_on";
  const targetFm = {};
  if (trigger === "glob" && typeof parsed.data.globs === "string" && parsed.data.globs.trim()) {
    targetFm.paths = parsed.data.globs.split(",").map((g) => g.trim()).filter(Boolean);
  } else if (trigger === "model_decision" || trigger === "manual") {
    issues.push({
      category: "rules",
      item: rule.name,
      severity: "warning",
      reason: `Antigravity trigger "${trigger}" has no Claude Code equivalent; converted as unconditional rule.`
    });
  }
  const descriptionPrefix = typeof parsed.data.description === "string" && parsed.data.description.trim() && (trigger === "model_decision" || trigger === "manual") ? `<!-- Antigravity trigger: ${trigger} | description: ${parsed.data.description.trim()} -->

` : "";
  return {
    content: stringifyFrontmatter(targetFm, `${descriptionPrefix}${parsed.body}`),
    issues
  };
}

// src/converters/skills.ts
var COMMAND_MARKER_KEY = "x-synced-from";
var COMMAND_MARKER_VALUE = "claude-command";
function convertSkillMdForAgy(skillName, rawSkillMd) {
  const issues = [];
  const parsed = parseFrontmatter(rawSkillMd);
  const existingName = typeof parsed.data.name === "string" ? parsed.data.name.trim() : "";
  const existingDesc = typeof parsed.data.description === "string" ? parsed.data.description.trim() : "";
  if (existingName === skillName && existingDesc.length > 0 && parsed.hasFrontmatter) {
    return { content: rawSkillMd, issues };
  }
  const description = existingDesc || extractFirstParagraph(parsed.body) || `Skill ${skillName} synced from Claude Code.`;
  if (!existingDesc) {
    issues.push({
      category: "skills",
      item: skillName,
      severity: "warning",
      reason: "SKILL.md lacked frontmatter description; synthesized from content."
    });
  }
  const nextFm = {
    ...parsed.data,
    name: skillName,
    description
  };
  return {
    content: stringifyFrontmatter(nextFm, parsed.body),
    issues
  };
}
function convertSkillMdForClaude(skill, rawSkillMd) {
  const parsed = parseFrontmatter(rawSkillMd);
  if (parsed.data[COMMAND_MARKER_KEY] === void 0) {
    return { content: rawSkillMd, issues: [] };
  }
  const rest = { ...parsed.data };
  delete rest[COMMAND_MARKER_KEY];
  return {
    content: stringifyFrontmatter(rest, parsed.body),
    issues: []
  };
}
function convertClaudeCommandToAgySkill(cmd) {
  const issues = [];
  const parsed = parseFrontmatter(cmd.rawContent);
  const description = typeof parsed.data.description === "string" && parsed.data.description.trim() || extractFirstParagraph(parsed.body) || `Slash command /${cmd.slug} synced from Claude Code.`;
  let body = parsed.body;
  const hasArgPlaceholders = /\$ARGUMENTS|\$\d+/.test(body);
  if (hasArgPlaceholders) {
    body = body.replace(/\$ARGUMENTS/g, "the arguments or target provided by the user").replace(/\$(\d+)/g, "argument #$1 provided by the user");
    issues.push({
      category: "commands",
      item: cmd.slug,
      severity: "warning",
      reason: "Rewrote Claude $ARGUMENTS/$N placeholders to plain instructions for Antigravity."
    });
  }
  const fm = {
    name: cmd.slug,
    description,
    [COMMAND_MARKER_KEY]: COMMAND_MARKER_VALUE
  };
  return {
    skillName: cmd.slug,
    skillMdContent: stringifyFrontmatter(fm, body),
    issues
  };
}
function convertAgySkillToClaudeCommand(skill, rawSkillMd) {
  const parsed = parseFrontmatter(rawSkillMd);
  if (parsed.data[COMMAND_MARKER_KEY] !== COMMAND_MARKER_VALUE) {
    return { isCommandOrigin: false, commandRelPath: "", content: "" };
  }
  const fm = {};
  if (typeof parsed.data.description === "string" && parsed.data.description.trim()) {
    fm.description = parsed.data.description.trim();
  }
  return {
    isCommandOrigin: true,
    commandRelPath: `${skill.name}.md`,
    content: stringifyFrontmatter(fm, parsed.body)
  };
}

// src/core/logger.ts
var SENSITIVE_KEY_PATTERN = /token|secret|key|password|passphrase|auth|credential|cookie/i;
function maskSensitiveMap(record) {
  if (!record) {
    return void 0;
  }
  const masked = {};
  for (const [k, v] of Object.entries(record)) {
    if (v.startsWith("${") && v.endsWith("}")) {
      masked[k] = v;
    } else if (SENSITIVE_KEY_PATTERN.test(k) || v.length > 0) {
      masked[k] = "***";
    } else {
      masked[k] = "";
    }
  }
  return masked;
}
function redactMcpConfigForPreview(config) {
  const clone = { ...config };
  if (clone.env && typeof clone.env === "object" && !Array.isArray(clone.env)) {
    clone.env = maskSensitiveMap(clone.env);
  }
  if (clone.headers && typeof clone.headers === "object" && !Array.isArray(clone.headers)) {
    clone.headers = maskSensitiveMap(clone.headers);
  }
  return clone;
}

// src/adapters/shared-reader.ts
import fs5 from "fs";
import path4 from "path";
function readAgentsFromDir(agentsDir) {
  if (!fs5.existsSync(agentsDir)) {
    return [];
  }
  const entries = fs5.readdirSync(agentsDir, { withFileTypes: true });
  return entries.filter((e) => {
    if (!e.name.endsWith(".md")) return false;
    const fullPath = path4.join(agentsDir, e.name);
    return e.isFile() || e.isSymbolicLink() && fs5.statSync(fullPath).isFile();
  }).map((e) => {
    const sourcePath = path4.join(agentsDir, e.name);
    return {
      slug: e.name.slice(0, -3),
      sourcePath,
      rawContent: fs5.readFileSync(sourcePath, "utf8")
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}
function readSkillsFromDir(skillsDir) {
  if (!fs5.existsSync(skillsDir)) {
    return [];
  }
  const entries = fs5.readdirSync(skillsDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    const skillDir = path4.join(skillsDir, entry.name);
    const isDir = entry.isDirectory() || entry.isSymbolicLink() && fs5.statSync(skillDir).isDirectory();
    if (!isDir) continue;
    const skillMdPath = path4.join(skillDir, "SKILL.md");
    if (!fs5.existsSync(skillMdPath)) continue;
    const relFiles = listFilesRecursive(skillDir);
    const files = relFiles.map((relPath) => ({
      relPath,
      content: fs5.readFileSync(path4.join(skillDir, relPath)),
      isSkillMd: relPath === "SKILL.md"
    }));
    skills.push({
      name: entry.name,
      sourceDir: skillDir,
      files
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
function readRulesFromDir(rulesDir) {
  if (!fs5.existsSync(rulesDir)) {
    return [];
  }
  return listFilesRecursive(rulesDir).filter((rel) => rel.endsWith(".md")).map((rel) => {
    const sourcePath = path4.join(rulesDir, rel);
    return {
      name: rel,
      sourcePath,
      rawContent: fs5.readFileSync(sourcePath, "utf8")
    };
  });
}
function readCommandsFromDir(commandsDir) {
  if (!fs5.existsSync(commandsDir)) {
    return [];
  }
  return listFilesRecursive(commandsDir).filter((rel) => rel.endsWith(".md")).map((rel) => {
    const sourcePath = path4.join(commandsDir, rel);
    const withoutExt = rel.slice(0, -3);
    const slug = withoutExt.replace(/\//g, "-");
    return {
      slug,
      relPath: rel,
      sourcePath,
      rawContent: fs5.readFileSync(sourcePath, "utf8")
    };
  });
}

// src/adapters/antigravity.ts
function isRecord3(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
var PROJECT_SCOPE_PLUGIN_MANIFEST = {
  name: "project-scope",
  displayName: "Project Scope MCP",
  version: "1.0.0",
  description: "Project-scoped MCP servers synced via agy-tools"
};
function readAntigravityBundle(mode, rootOrHome, categories) {
  const paths = getAntigravityPaths(mode, rootOrHome);
  const issues = [];
  const agents = categories.has("agents") ? readAgentsFromDir(paths.agentsDir) : [];
  const skills = categories.has("skills") || categories.has("commands") ? readSkillsFromDir(paths.skillsDir) : [];
  let rootRule = null;
  let modularRules = [];
  if (categories.has("rules")) {
    if (fs6.existsSync(paths.rootRuleFile)) {
      rootRule = {
        sourcePath: paths.rootRuleFile,
        rawContent: fs6.readFileSync(paths.rootRuleFile, "utf8")
      };
    } else if (paths.fallbackRootRuleFile && fs6.existsSync(paths.fallbackRootRuleFile)) {
      rootRule = {
        sourcePath: paths.fallbackRootRuleFile,
        rawContent: fs6.readFileSync(paths.fallbackRootRuleFile, "utf8")
      };
    }
    modularRules = readRulesFromDir(paths.rulesDir);
  }
  let mcpServers = {};
  let mcpSourcePath = null;
  if (categories.has("mcp")) {
    if (fs6.existsSync(paths.mcpFile)) {
      mcpSourcePath = paths.mcpFile;
      const rawMcp = readJsonIfExists(paths.mcpFile);
      if (rawMcp && isRecord3(rawMcp.mcpServers)) {
        mcpServers = rawMcp.mcpServers;
      }
    }
    if (mode === "project") {
      const pluginsDir = path5.join(paths.baseDir, "plugins");
      if (fs6.existsSync(pluginsDir)) {
        for (const entry of fs6.readdirSync(pluginsDir, { withFileTypes: true })) {
          if (entry.isDirectory() && entry.name !== "project-scope" && fs6.existsSync(path5.join(pluginsDir, entry.name, "mcp_config.json"))) {
            issues.push({
              category: "mcp",
              item: entry.name,
              severity: "warning",
              reason: `Found MCP config in extra plugin "${entry.name}"; only "project-scope" is synced automatically.`
            });
          }
        }
      }
    }
  }
  let hooksData = null;
  let hooksSourcePath = null;
  if (categories.has("hooks") && fs6.existsSync(paths.hooksFile)) {
    hooksSourcePath = paths.hooksFile;
    hooksData = readJsonIfExists(paths.hooksFile);
  }
  return {
    platform: "agy",
    mode,
    agents,
    skills,
    rootRule,
    modularRules,
    mcpServers,
    mcpSourcePath,
    commands: [],
    hooksData,
    hooksSourcePath,
    issues
  };
}
function buildAntigravityTargetArtifacts(bundle, mode, rootOrHome, categories) {
  const paths = getAntigravityPaths(mode, rootOrHome);
  const artifacts = [];
  const issues = [...bundle.issues];
  if (categories.has("agents")) {
    for (const agent of bundle.agents) {
      const converted = convertAgentToAgy(agent);
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "agents",
        itemName: agent.slug,
        sourcePath: agent.sourcePath,
        targetPath: path5.join(paths.agentsDir, `${agent.slug}.md`),
        content: Buffer.from(converted.content, "utf8")
      });
    }
  }
  if (categories.has("skills")) {
    for (const skill of bundle.skills) {
      for (const file of skill.files) {
        let outBuffer = file.content;
        if (file.isSkillMd) {
          const converted = convertSkillMdForAgy(skill.name, file.content.toString("utf8"));
          issues.push(...converted.issues);
          outBuffer = Buffer.from(converted.content, "utf8");
        }
        artifacts.push({
          kind: "text",
          category: "skills",
          itemName: `${skill.name}/${file.relPath}`,
          sourcePath: path5.join(skill.sourceDir, file.relPath),
          targetPath: path5.join(paths.skillsDir, skill.name, file.relPath),
          content: outBuffer
        });
      }
    }
  }
  if (categories.has("commands")) {
    for (const cmd of bundle.commands) {
      const converted = convertClaudeCommandToAgySkill(cmd);
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "commands",
        itemName: `${converted.skillName}/SKILL.md`,
        sourcePath: cmd.sourcePath,
        targetPath: path5.join(paths.skillsDir, converted.skillName, "SKILL.md"),
        content: Buffer.from(converted.skillMdContent, "utf8")
      });
    }
  }
  if (categories.has("rules")) {
    if (bundle.rootRule) {
      const converted = convertRootRule(bundle.rootRule.rawContent, "claude-to-agy", "GEMINI.md");
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "rules",
        itemName: "GEMINI.md",
        sourcePath: bundle.rootRule.sourcePath,
        targetPath: paths.rootRuleFile,
        content: Buffer.from(converted.content, "utf8")
      });
    }
    for (const rule of bundle.modularRules) {
      const converted = convertModularRuleToAgy(rule);
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "rules",
        itemName: rule.name,
        sourcePath: rule.sourcePath,
        targetPath: path5.join(paths.rulesDir, rule.name),
        content: Buffer.from(converted.content, "utf8")
      });
    }
  }
  if (categories.has("mcp") && Object.keys(bundle.mcpServers).length > 0) {
    const converted = convertMcpToAgy(bundle.mcpServers);
    issues.push(...converted.issues);
    if (Object.keys(converted.servers).length > 0) {
      if (mode === "project" && paths.projectScopePluginJson) {
        artifacts.push({
          kind: "text",
          category: "mcp",
          itemName: "project-scope/plugin.json",
          sourcePath: bundle.mcpSourcePath ?? ".mcp.json",
          targetPath: paths.projectScopePluginJson,
          content: Buffer.from(`${JSON.stringify(PROJECT_SCOPE_PLUGIN_MANIFEST, null, 2)}
`, "utf8")
        });
      }
      const serverNames = Object.keys(converted.servers);
      artifacts.push({
        kind: "json-merge",
        category: "mcp",
        itemName: `mcpServers (${serverNames.join(", ")})`,
        sourcePath: bundle.mcpSourcePath ?? "claude-mcp",
        targetPath: paths.mcpFile,
        merge: (existing) => {
          const prevServers = isRecord3(existing.mcpServers) ? { ...existing.mcpServers } : {};
          return {
            ...existing,
            mcpServers: {
              ...prevServers,
              ...converted.servers
            }
          };
        },
        extractSlice: (full) => {
          const all = isRecord3(full.mcpServers) ? full.mcpServers : {};
          const slice = {};
          for (const name of serverNames) {
            if (all[name] !== void 0) {
              slice[name] = all[name];
            }
          }
          return slice;
        },
        redactSlice: (slice) => {
          if (!isRecord3(slice)) return slice;
          const out = {};
          for (const [name, cfg] of Object.entries(slice)) {
            out[name] = isRecord3(cfg) ? redactMcpConfigForPreview(cfg) : cfg;
          }
          return out;
        }
      });
    }
  }
  if (categories.has("hooks") && bundle.hooksData) {
    const converted = convertHooksToAgy(bundle.hooksData);
    issues.push(...converted.issues);
    if (Object.keys(converted.hooksJson).length > 0) {
      artifacts.push({
        kind: "json-merge",
        category: "hooks",
        itemName: "hooks.json",
        sourcePath: bundle.hooksSourcePath ?? "settings.json",
        targetPath: paths.hooksFile,
        merge: (existing) => ({
          ...existing,
          ...converted.hooksJson
        }),
        extractSlice: (full) => ({
          "synced-from-claude": full["synced-from-claude"] ?? null
        })
      });
    }
  }
  return { artifacts, issues };
}

// src/adapters/claude.ts
import fs7 from "fs";
import path6 from "path";
function isRecord4(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function readClaudeBundle(mode, rootOrHome, categories) {
  const paths = getClaudePaths(mode, rootOrHome);
  const issues = [];
  const agents = categories.has("agents") ? readAgentsFromDir(paths.agentsDir) : [];
  const skills = categories.has("skills") ? readSkillsFromDir(paths.skillsDir) : [];
  const commands = categories.has("commands") ? readCommandsFromDir(paths.commandsDir) : [];
  let rootRule = null;
  let modularRules = [];
  if (categories.has("rules")) {
    if (fs7.existsSync(paths.rootRuleFile)) {
      rootRule = {
        sourcePath: paths.rootRuleFile,
        rawContent: fs7.readFileSync(paths.rootRuleFile, "utf8")
      };
    }
    modularRules = readRulesFromDir(paths.rulesDir);
  }
  let mcpServers = {};
  let mcpSourcePath = null;
  if (categories.has("mcp") && fs7.existsSync(paths.mcpFile)) {
    mcpSourcePath = paths.mcpFile;
    const rawMcp = readJsonIfExists(paths.mcpFile);
    if (rawMcp && isRecord4(rawMcp.mcpServers)) {
      mcpServers = rawMcp.mcpServers;
    }
  }
  let hooksData = null;
  let hooksSourcePath = null;
  if (categories.has("hooks") && fs7.existsSync(paths.hooksSettingsFile)) {
    const rawSettings = readJsonIfExists(paths.hooksSettingsFile);
    if (rawSettings && isRecord4(rawSettings.hooks)) {
      hooksData = rawSettings.hooks;
      hooksSourcePath = paths.hooksSettingsFile;
    }
  }
  return {
    platform: "claude",
    mode,
    agents,
    skills,
    rootRule,
    modularRules,
    mcpServers,
    mcpSourcePath,
    commands,
    hooksData,
    hooksSourcePath,
    issues
  };
}
function buildClaudeTargetArtifacts(bundle, mode, rootOrHome, categories) {
  const paths = getClaudePaths(mode, rootOrHome);
  const artifacts = [];
  const issues = [...bundle.issues];
  if (categories.has("agents")) {
    for (const agent of bundle.agents) {
      const converted = convertAgentToClaude(agent);
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "agents",
        itemName: agent.slug,
        sourcePath: agent.sourcePath,
        targetPath: path6.join(paths.agentsDir, `${agent.slug}.md`),
        content: Buffer.from(converted.content, "utf8")
      });
    }
  }
  if (categories.has("skills")) {
    for (const skill of bundle.skills) {
      for (const file of skill.files) {
        let outBuffer = file.content;
        if (file.isSkillMd) {
          const converted = convertSkillMdForClaude(skill, file.content.toString("utf8"));
          issues.push(...converted.issues);
          outBuffer = Buffer.from(converted.content, "utf8");
        }
        artifacts.push({
          kind: "text",
          category: "skills",
          itemName: `${skill.name}/${file.relPath}`,
          sourcePath: path6.join(skill.sourceDir, file.relPath),
          targetPath: path6.join(paths.skillsDir, skill.name, file.relPath),
          content: outBuffer
        });
      }
    }
  }
  if (categories.has("commands")) {
    for (const skill of bundle.skills) {
      const skillMd = skill.files.find((f) => f.isSkillMd);
      if (!skillMd) continue;
      const extracted = convertAgySkillToClaudeCommand(skill, skillMd.content.toString("utf8"));
      if (extracted.isCommandOrigin) {
        artifacts.push({
          kind: "text",
          category: "commands",
          itemName: extracted.commandRelPath,
          sourcePath: path6.join(skill.sourceDir, "SKILL.md"),
          targetPath: path6.join(paths.commandsDir, extracted.commandRelPath),
          content: Buffer.from(extracted.content, "utf8")
        });
      }
    }
  }
  if (categories.has("rules")) {
    if (bundle.rootRule) {
      const converted = convertRootRule(bundle.rootRule.rawContent, "agy-to-claude", path6.basename(bundle.rootRule.sourcePath));
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "rules",
        itemName: "CLAUDE.md",
        sourcePath: bundle.rootRule.sourcePath,
        targetPath: paths.rootRuleFile,
        content: Buffer.from(converted.content, "utf8")
      });
    }
    for (const rule of bundle.modularRules) {
      const converted = convertModularRuleToClaude(rule);
      issues.push(...converted.issues);
      artifacts.push({
        kind: "text",
        category: "rules",
        itemName: rule.name,
        sourcePath: rule.sourcePath,
        targetPath: path6.join(paths.rulesDir, rule.name),
        content: Buffer.from(converted.content, "utf8")
      });
    }
  }
  if (categories.has("mcp") && Object.keys(bundle.mcpServers).length > 0) {
    const converted = convertMcpToClaude(bundle.mcpServers);
    issues.push(...converted.issues);
    if (Object.keys(converted.servers).length > 0) {
      const serverNames = Object.keys(converted.servers);
      artifacts.push({
        kind: "json-merge",
        category: "mcp",
        itemName: `mcpServers (${serverNames.join(", ")})`,
        sourcePath: bundle.mcpSourcePath ?? "antigravity-mcp",
        targetPath: paths.mcpFile,
        merge: (existing) => {
          const prevServers = isRecord4(existing.mcpServers) ? { ...existing.mcpServers } : {};
          return {
            ...existing,
            mcpServers: {
              ...prevServers,
              ...converted.servers
            }
          };
        },
        extractSlice: (full) => {
          const all = isRecord4(full.mcpServers) ? full.mcpServers : {};
          const slice = {};
          for (const name of serverNames) {
            if (all[name] !== void 0) {
              slice[name] = all[name];
            }
          }
          return slice;
        },
        redactSlice: (slice) => {
          if (!isRecord4(slice)) return slice;
          const out = {};
          for (const [name, cfg] of Object.entries(slice)) {
            out[name] = isRecord4(cfg) ? redactMcpConfigForPreview(cfg) : cfg;
          }
          return out;
        }
      });
    }
  }
  if (categories.has("hooks") && bundle.hooksData) {
    const converted = convertHooksToClaude(bundle.hooksData);
    issues.push(...converted.issues);
    if (Object.keys(converted.claudeHooks).length > 0) {
      artifacts.push({
        kind: "json-merge",
        category: "hooks",
        itemName: "settings.json (hooks)",
        sourcePath: bundle.hooksSourcePath ?? "hooks.json",
        targetPath: paths.hooksSettingsFile,
        merge: (existing) => {
          const prevHooks = isRecord4(existing.hooks) ? { ...existing.hooks } : {};
          return {
            ...existing,
            hooks: {
              ...prevHooks,
              ...converted.claudeHooks
            }
          };
        },
        extractSlice: (full) => isRecord4(full.hooks) ? full.hooks : {}
      });
    }
  }
  return { artifacts, issues };
}

// src/sync/planner.ts
import crypto3 from "crypto";
import fs8 from "fs";
import { createPatch } from "diff";
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function isProbablyUtf8Text(buf) {
  return !buf.includes(0);
}
function planTextArtifact(artifact) {
  const exists = fs8.existsSync(artifact.targetPath);
  if (!exists) {
    const nextPreview = isProbablyUtf8Text(artifact.content) ? artifact.content.toString("utf8") : `<binary ${artifact.content.length} bytes>`;
    return {
      artifact,
      action: "create",
      existingPreview: "",
      nextPreview,
      diffText: ""
    };
  }
  const existingBuf = fs8.readFileSync(artifact.targetPath);
  const bothText = isProbablyUtf8Text(existingBuf) && isProbablyUtf8Text(artifact.content);
  if (bothText) {
    const existingText = existingBuf.toString("utf8");
    const nextText = artifact.content.toString("utf8");
    if (sha256Normalized(existingText) === sha256Normalized(nextText)) {
      return {
        artifact,
        action: "unchanged",
        existingPreview: existingText,
        nextPreview: nextText,
        diffText: ""
      };
    }
    const diffText = createPatch(artifact.targetPath, existingText, nextText, "existing", "incoming");
    return {
      artifact,
      action: "update",
      existingPreview: existingText,
      nextPreview: nextText,
      diffText
    };
  }
  const hashA = crypto3.createHash("sha256").update(existingBuf).digest("hex");
  const hashB = crypto3.createHash("sha256").update(artifact.content).digest("hex");
  if (hashA === hashB) {
    return {
      artifact,
      action: "unchanged",
      existingPreview: `<binary ${existingBuf.length} bytes>`,
      nextPreview: `<binary ${artifact.content.length} bytes>`,
      diffText: ""
    };
  }
  return {
    artifact,
    action: "update",
    existingPreview: `<binary ${existingBuf.length} bytes>`,
    nextPreview: `<binary ${artifact.content.length} bytes>`,
    diffText: `Binary file differs (${existingBuf.length} bytes -> ${artifact.content.length} bytes)`
  };
}
function planJsonMergeArtifact(artifact) {
  const exists = fs8.existsSync(artifact.targetPath);
  const existingObj = exists ? readJsonIfExists(artifact.targetPath) ?? {} : {};
  const nextFull = artifact.merge(existingObj);
  const prevSlice = artifact.extractSlice(existingObj);
  const nextSlice = artifact.extractSlice(nextFull);
  const prevPreviewObj = artifact.redactSlice ? artifact.redactSlice(prevSlice) : prevSlice;
  const nextPreviewObj = artifact.redactSlice ? artifact.redactSlice(nextSlice) : nextSlice;
  const existingPreview = `${JSON.stringify(prevPreviewObj, null, 2)}
`;
  const nextPreview = `${JSON.stringify(nextPreviewObj, null, 2)}
`;
  if (!exists) {
    return {
      artifact,
      action: "create",
      existingPreview: "",
      nextPreview,
      diffText: ""
    };
  }
  if (stableStringify(prevSlice) === stableStringify(nextSlice)) {
    return {
      artifact,
      action: "unchanged",
      existingPreview,
      nextPreview,
      diffText: ""
    };
  }
  const diffText = createPatch(artifact.targetPath, existingPreview, nextPreview, "existing", "incoming");
  return {
    artifact,
    action: "update",
    existingPreview,
    nextPreview,
    diffText
  };
}
function buildSyncPlan(artifacts) {
  return artifacts.map(
    (artifact) => artifact.kind === "text" ? planTextArtifact(artifact) : planJsonMergeArtifact(artifact)
  );
}

// src/sync/runner.ts
function prepareSyncPlan(options) {
  if (options.from === options.to) {
    throw new AppError("CLI_INVALID_ARGS", "Source (--from) and target (--to) platforms must be different.");
  }
  const categorySet = new Set(options.categories);
  const bundle = options.from === "claude" ? readClaudeBundle(options.mode, options.rootOrHome, categorySet) : readAntigravityBundle(options.mode, options.rootOrHome, categorySet);
  const built = options.to === "agy" ? buildAntigravityTargetArtifacts(bundle, options.mode, options.rootOrHome, categorySet) : buildClaudeTargetArtifacts(bundle, options.mode, options.rootOrHome, categorySet);
  const plan = buildSyncPlan(built.artifacts);
  return {
    plan,
    issues: built.issues
  };
}
async function executeSync(options) {
  const { plan, issues } = prepareSyncPlan(options);
  const conflicts = plan.filter((item) => item.action === "update");
  const decisions = /* @__PURE__ */ new Map();
  if (!options.dryRun && conflicts.length > 0) {
    if (options.force) {
      for (const item of conflicts) decisions.set(item, "overwrite");
    } else if (options.skipExisting) {
      for (const item of conflicts) decisions.set(item, "skip");
    } else if (options.resolveConflicts) {
      const resolved = await options.resolveConflicts(conflicts);
      if (resolved === "abort") {
        throw new AppError("SYNC_CONFLICT_ABORTED", "Sync aborted by user during conflict resolution.");
      }
      for (const [k, v] of resolved.entries()) {
        decisions.set(k, v);
      }
    } else if (options.strictConflicts) {
      throw new AppError(
        "SYNC_CONFLICT_ABORTED",
        `Detected ${conflicts.length} conflicting target file(s). Pass --force or --skip-existing.`
      );
    } else {
      for (const item of conflicts) decisions.set(item, "skip");
    }
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const backups = [];
  const items = [];
  for (const planItem of plan) {
    let finalAction = planItem.action;
    if (planItem.action === "update" && !options.dryRun) {
      const decision = decisions.get(planItem) ?? "skip";
      if (decision === "skip") {
        finalAction = "skipped";
      }
    }
    if (!options.dryRun && (finalAction === "create" || finalAction === "update")) {
      const targetPath = planItem.artifact.targetPath;
      if (finalAction === "update" && !options.noBackup && fs9.existsSync(targetPath)) {
        const backupPath = createBackupFile(targetPath);
        if (backupPath) {
          backups.push({ targetPath, backupPath });
        }
      }
      if (planItem.artifact.kind === "text") {
        writeFileAtomic(targetPath, planItem.artifact.content);
      } else {
        const existingObj = fs9.existsSync(targetPath) ? readJsonIfExists(targetPath) ?? {} : {};
        const merged = planItem.artifact.merge(existingObj);
        writeFileAtomic(targetPath, `${JSON.stringify(merged, null, 2)}
`);
      }
    }
    if (finalAction === "create") created += 1;
    else if (finalAction === "update") updated += 1;
    else if (finalAction === "unchanged") unchanged += 1;
    else if (finalAction === "skipped") skipped += 1;
    items.push({
      category: planItem.artifact.category,
      itemName: planItem.artifact.itemName,
      targetPath: planItem.artifact.targetPath,
      action: finalAction
    });
  }
  return {
    created,
    updated,
    unchanged,
    skipped,
    backups,
    items,
    issues
  };
}

// src/cli/formatters.ts
import Table from "cli-table3";
import pc from "picocolors";
function formatAccountSummary(account) {
  if (!account) {
    return "unknown account";
  }
  const emailPart = account.email ?? "unknown email";
  const methodPart = account.authMethod ? ` (${account.authMethod})` : "";
  return `${emailPart}${methodPart}`;
}
function printAuthStatus(status) {
  if (!status.authenticated) {
    console.log(pc.yellow("Not authenticated: no agy OAuth credential found in keyring or fallback file."));
    return;
  }
  const table = new Table({
    head: [pc.cyan("Field"), pc.cyan("Value")]
  });
  table.push(
    ["Status", pc.green("Authenticated")],
    ["Storage", status.source ?? "unknown"],
    ["Email", status.account?.email ?? "(unavailable)"],
    ["Auth Method", status.account?.authMethod ?? "(unknown)"],
    ["Token Expiry", status.account?.expiry ?? "(unknown)"]
  );
  console.log(table.toString());
}
function printDiffText(diffText) {
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      console.log(pc.green(line));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      console.log(pc.red(line));
    } else if (line.startsWith("@@")) {
      console.log(pc.cyan(line));
    } else {
      console.log(line);
    }
  }
}
function colorizeAction(action) {
  switch (action) {
    case "create":
      return pc.green("create");
    case "update":
      return pc.yellow("update");
    case "unchanged":
      return pc.dim("unchanged");
    case "skipped":
      return pc.magenta("skipped");
    default:
      return action;
  }
}
function printSyncResult(result, dryRun) {
  console.log("");
  console.log(pc.bold(dryRun ? "Sync Plan (Dry Run - No Changes Written):" : "Sync Execution Summary:"));
  if (result.items.length === 0) {
    console.log(pc.yellow("No matching configuration items found for the selected categories and mode."));
  } else {
    const itemsTable = new Table({
      head: [pc.cyan("Category"), pc.cyan("Item"), pc.cyan("Action"), pc.cyan("Target Path")]
    });
    for (const item of result.items) {
      itemsTable.push([item.category, item.itemName, colorizeAction(item.action), item.targetPath]);
    }
    console.log(itemsTable.toString());
  }
  const summaryTable = new Table({
    head: [pc.cyan("Created"), pc.cyan("Updated"), pc.cyan("Unchanged"), pc.cyan("Skipped"), pc.cyan("Backups"), pc.cyan("Warnings")]
  });
  summaryTable.push([
    pc.green(String(result.created)),
    pc.yellow(String(result.updated)),
    pc.dim(String(result.unchanged)),
    pc.magenta(String(result.skipped)),
    String(result.backups.length),
    result.issues.length > 0 ? pc.yellow(String(result.issues.length)) : "0"
  ]);
  console.log(summaryTable.toString());
  if (result.backups.length > 0) {
    console.log(pc.bold("\nBackups Created:"));
    for (const b of result.backups) {
      console.log(`  ${pc.dim(b.targetPath)} -> ${pc.cyan(b.backupPath)}`);
    }
  }
  if (result.issues.length > 0) {
    console.log(pc.bold("\nConversion Warnings & Skipped Items:"));
    const issueTable = new Table({
      head: [pc.cyan("Severity"), pc.cyan("Category"), pc.cyan("Item"), pc.cyan("Reason")]
    });
    for (const issue of result.issues) {
      const sev = issue.severity === "skipped" ? pc.magenta("skipped") : pc.yellow("warning");
      issueTable.push([sev, issue.category, issue.item, issue.reason]);
    }
    console.log(issueTable.toString());
  }
}

// src/cli/prompts.ts
import { checkbox, confirm, input, password, select } from "@inquirer/prompts";
import pc2 from "picocolors";
async function promptMainMenu() {
  return select({
    message: "Select an agy-tools operation:",
    choices: [
      { name: "Sync agent configs (Claude Code <-> Antigravity)", value: "sync" },
      { name: "Backup agy authentication to JSON", value: "auth-backup" },
      { name: "Import agy authentication from JSON", value: "auth-import" },
      { name: "Check agy authentication status", value: "auth-status" }
    ]
  });
}
async function promptBackupPassphrase() {
  const first = await password({
    message: "Enter passphrase to encrypt auth backup:",
    mask: "*",
    validate: (val) => val.length >= 1 ? true : "Passphrase cannot be empty."
  });
  const second = await password({
    message: "Confirm passphrase:",
    mask: "*",
    validate: (val) => val === first ? true : "Passphrases do not match."
  });
  return second;
}
async function promptImportPassphrase() {
  return password({
    message: "Enter passphrase to decrypt auth backup:",
    mask: "*",
    validate: (val) => val.length >= 1 ? true : "Passphrase cannot be empty."
  });
}
async function promptInputPath(message, defaultValue) {
  return input({
    message,
    default: defaultValue,
    validate: (val) => val.trim().length > 0 ? true : "Path cannot be empty."
  });
}
async function promptConfirm(message, defaultValue = false) {
  return confirm({ message, default: defaultValue });
}
async function promptSyncDirection() {
  const direction = await select({
    message: "Select sync direction:",
    choices: [
      { name: "Claude Code -> Antigravity (agy)", value: "claude-to-agy" },
      { name: "Antigravity (agy) -> Claude Code", value: "agy-to-claude" }
    ]
  });
  return direction === "claude-to-agy" ? { from: "claude", to: "agy" } : { from: "agy", to: "claude" };
}
async function promptSyncMode() {
  return select({
    message: "Select configuration scope:",
    choices: [
      { name: "Project scope (.claude / .agents in project directory)", value: "project" },
      { name: "Global scope (~/.claude / ~/.gemini/config)", value: "global" }
    ]
  });
}
async function promptSyncCategories() {
  const recSet = new Set(DEFAULT_RECOMMENDED_CATEGORIES);
  return checkbox({
    message: "Select configuration categories to sync:",
    required: true,
    choices: [
      {
        name: "Agents / Subagents (Recommended)",
        value: "agents",
        checked: recSet.has("agents")
      },
      {
        name: "Skills (Recommended)",
        value: "skills",
        checked: recSet.has("skills")
      },
      {
        name: "Rules / Instructions (Recommended)",
        value: "rules",
        checked: recSet.has("rules")
      },
      {
        name: "MCP Servers (Project -> .agents/plugins/project-scope/)",
        value: "mcp",
        checked: recSet.has("mcp")
      },
      {
        name: "Slash Commands (Claude commands -> Antigravity skills)",
        value: "commands",
        checked: recSet.has("commands")
      },
      {
        name: "Hooks (Best-effort command hook mapping)",
        value: "hooks",
        checked: recSet.has("hooks")
      }
    ]
  });
}
async function promptResolveConflicts(conflicts) {
  console.log(pc2.yellow(`
Detected ${conflicts.length} existing target file(s) with differences:`));
  for (const c of conflicts) {
    console.log(`  - [${c.artifact.category}] ${c.artifact.targetPath}`);
  }
  const strategy = await select({
    message: "How do you want to handle conflicting files? (Overwrites create .bak backups automatically)",
    choices: [
      { name: "Review each conflict with diff preview", value: "review-each" },
      { name: "Overwrite all (create .bak backups)", value: "overwrite-all" },
      { name: "Skip all existing conflicting files", value: "skip-all" },
      { name: "Abort sync", value: "abort" }
    ]
  });
  if (strategy === "abort") {
    return "abort";
  }
  const map = /* @__PURE__ */ new Map();
  if (strategy === "overwrite-all") {
    for (const c of conflicts) map.set(c, "overwrite");
    return map;
  }
  if (strategy === "skip-all") {
    for (const c of conflicts) map.set(c, "skip");
    return map;
  }
  for (const c of conflicts) {
    console.log(`
${pc2.bold(c.artifact.targetPath)}`);
    if (c.diffText) {
      printDiffText(c.diffText);
    }
    const overwrite = await confirm({
      message: `Overwrite ${c.artifact.itemName}? (creates .bak backup)`,
      default: false
    });
    map.set(c, overwrite ? "overwrite" : "skip");
  }
  return map;
}

// src/cli/index.ts
function isInteractiveTty() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
function parseCategoriesFlag(raw) {
  const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) {
    throw new AppError("CLI_INVALID_ARGS", "Categories list cannot be empty.");
  }
  if (parts.includes("all")) {
    return [...ALL_SYNC_CATEGORIES];
  }
  const valid = new Set(ALL_SYNC_CATEGORIES);
  const selected = [];
  for (const part of parts) {
    if (!valid.has(part)) {
      throw new AppError(
        "CLI_INVALID_ARGS",
        `Unknown category "${part}". Valid values: ${ALL_SYNC_CATEGORIES.join(", ")}, all`
      );
    }
    if (!selected.includes(part)) {
      selected.push(part);
    }
  }
  return selected;
}
function parsePlatform(val, flagName) {
  const normalized = val.trim().toLowerCase();
  if (normalized === "claude") return "claude";
  if (normalized === "agy" || normalized === "antigravity") return "agy";
  throw new AppError("CLI_INVALID_ARGS", `Invalid ${flagName} value "${val}". Use "claude" or "agy".`);
}
function parseMode(val) {
  const normalized = val.trim().toLowerCase();
  if (normalized === "project" || normalized === "global") return normalized;
  throw new AppError("CLI_INVALID_ARGS", `Invalid --mode value "${val}". Use "project" or "global".`);
}
async function handleAuthBackup(opts) {
  let outputPath = opts.output;
  if (!outputPath) {
    outputPath = isInteractiveTty() ? await promptInputPath("Output backup JSON path:", "./agy-auth-backup.json") : "./agy-auth-backup.json";
  }
  outputPath = path7.resolve(outputPath);
  let force = Boolean(opts.force);
  if (!force && fs10.existsSync(outputPath) && isInteractiveTty()) {
    force = await promptConfirm(`File ${outputPath} already exists. Overwrite?`, false);
    if (!force) {
      throw new AppError("SYNC_CONFLICT_ABORTED", "Backup cancelled by user.");
    }
  }
  let passphrase = opts.passphrase;
  if (opts.encrypt && !passphrase) {
    if (!isInteractiveTty()) {
      throw new AppError("CLI_INVALID_ARGS", "Passphrase is required in non-interactive mode (--passphrase).");
    }
    passphrase = await promptBackupPassphrase();
  }
  const res = await backupAuth({
    outputPath,
    encrypt: Boolean(opts.encrypt),
    passphrase,
    force,
    fileFallback: Boolean(opts.fileFallback)
  });
  console.log(
    pc3.green(
      `Backed up agy auth for ${formatAccountSummary(res.account)} from ${res.source} -> ${res.outputPath}` + (res.encrypted ? " (encrypted)" : " (plain JSON)")
    )
  );
  if (!res.encrypted) {
    console.log(
      pc3.yellow("Warning: Backup file contains live OAuth tokens. Keep it private and never commit it to Git.")
    );
  }
}
async function handleAuthImport(fileArg, opts) {
  let inputPath = fileArg;
  if (!inputPath) {
    if (!isInteractiveTty()) {
      throw new AppError("CLI_INVALID_ARGS", "Backup JSON file path is required.");
    }
    inputPath = await promptInputPath("Path to auth backup JSON file:", "./agy-auth-backup.json");
  }
  inputPath = path7.resolve(inputPath);
  const inspected = inspectImportFile(inputPath);
  let passphrase = opts.passphrase;
  if (inspected.encrypted && !passphrase) {
    if (!isInteractiveTty()) {
      throw new AppError("CRYPTO_DECRYPT_FAILED", "Passphrase is required to decrypt backup (--passphrase).");
    }
    passphrase = await promptImportPassphrase();
  }
  const { credential, account } = inspected.resolveCredential(passphrase);
  const currentStatus = await getAuthStatus({ fileFallback: Boolean(opts.fileFallback) });
  if (!opts.dryRun && currentStatus.authenticated && !opts.yes && isInteractiveTty()) {
    const ok = await promptConfirm(
      `Overwrite active credential (${formatAccountSummary(currentStatus.account)}) with ${formatAccountSummary(account)}?`,
      false
    );
    if (!ok) {
      throw new AppError("SYNC_CONFLICT_ABORTED", "Auth import cancelled by user.");
    }
  }
  const res = await applyImportedCredential(credential, {
    dryRun: Boolean(opts.dryRun),
    fileFallback: Boolean(opts.fileFallback)
  });
  if (!res.applied) {
    console.log(
      pc3.cyan(`[Dry Run] Verified valid backup for ${formatAccountSummary(res.importedAccount)}. No keyring changes made.`)
    );
    return;
  }
  console.log(
    pc3.green(`Imported agy auth for ${formatAccountSummary(res.importedAccount)} into ${res.targetSource}.`)
  );
}
async function handleAuthStatus(opts) {
  const status = await getAuthStatus({ fileFallback: Boolean(opts.fileFallback) });
  if (opts.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  printAuthStatus(status);
}
async function handleSync(opts) {
  let from;
  let to;
  if (opts.from && opts.to) {
    from = parsePlatform(opts.from, "--from");
    to = parsePlatform(opts.to, "--to");
  } else if (opts.from && !opts.to) {
    from = parsePlatform(opts.from, "--from");
    to = from === "claude" ? "agy" : "claude";
  } else if (!opts.from && opts.to) {
    to = parsePlatform(opts.to, "--to");
    from = to === "claude" ? "agy" : "claude";
  } else if (isInteractiveTty()) {
    const chosen = await promptSyncDirection();
    from = chosen.from;
    to = chosen.to;
  } else {
    throw new AppError("CLI_INVALID_ARGS", "Missing --from and --to in non-interactive mode.");
  }
  if (from === to) {
    throw new AppError("CLI_INVALID_ARGS", "Source and target platforms must differ.");
  }
  const mode = opts.mode ? parseMode(opts.mode) : isInteractiveTty() ? await promptSyncMode() : (() => {
    throw new AppError("CLI_INVALID_ARGS", "Missing --mode <project|global> in non-interactive mode.");
  })();
  const categories = opts.categories ? parseCategoriesFlag(opts.categories) : isInteractiveTty() ? await promptSyncCategories() : ["agents", "skills", "rules"];
  const rootOrHome = mode === "global" ? os4.homedir() : resolveProjectRoot(opts.projectDir);
  const result = await executeSync({
    from,
    to,
    mode,
    rootOrHome,
    categories,
    dryRun: Boolean(opts.dryRun),
    force: Boolean(opts.force),
    skipExisting: Boolean(opts.skipExisting),
    noBackup: opts.backup === false,
    strictConflicts: Boolean(opts.strictConflicts),
    resolveConflicts: !opts.force && !opts.skipExisting && !opts.yes && isInteractiveTty() ? promptResolveConflicts : void 0
  });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  printSyncResult(result, Boolean(opts.dryRun));
}
async function runCli() {
  const program = new Command();
  program.name("agy-tools").description("CLI toolkit for agy auth backup/import and Claude Code <-> Antigravity config sync").version("1.0.0");
  const authCmd = program.command("auth").description("Backup, import, and inspect agy OAuth authentication");
  authCmd.command("backup").description("Export active agy OAuth credential into a single JSON file").option("-o, --output <path>", "Output JSON file path").option("--encrypt", "Encrypt credential payload using AES-256-GCM").option("--passphrase <str>", "Encryption passphrase (prefer interactive prompt)").option("--force", "Overwrite output file if it already exists").option("--file-fallback", "Read credential from fallback token file instead of OS keyring").action(async (opts) => {
    await handleAuthBackup(opts);
  });
  authCmd.command("import [file]").description("Import a single-account JSON backup into agy OS keyring").option("--passphrase <str>", "Decryption passphrase for encrypted backup").option("--dry-run", "Validate and decrypt backup without modifying keyring").option("--file-fallback", "Write credential to fallback token file instead of OS keyring").option("-y, --yes", "Skip overwrite confirmation prompt").action(async (file, opts) => {
    await handleAuthImport(file, opts);
  });
  authCmd.command("status").description("Inspect current agy authentication status without revealing secrets").option("--file-fallback", "Check fallback token file instead of OS keyring").option("--json", "Output status as JSON").action(async (opts) => {
    await handleAuthStatus(opts);
  });
  program.command("sync").description("Sync agent configurations between Claude Code and Antigravity").option("--from <platform>", "Source platform: claude | agy").option("--to <platform>", "Target platform: claude | agy").option("--mode <scope>", "Sync scope: project | global").option("--project-dir <path>", "Explicit project root directory (for project mode)").option("-c, --categories <list>", "Comma-separated: agents,skills,rules,mcp,commands,hooks,all").option("--dry-run", "Preview sync plan and warnings without writing files").option("--force", "Overwrite conflicting files automatically (creates .bak)").option("--skip-existing", "Skip conflicting files without modifying them").option("--no-backup", "Disable automatic .bak backups before overwriting").option("--strict-conflicts", "Abort with exit code 7 when conflicts exist without --force/--skip-existing").option("-y, --yes", "Non-interactive mode (skips conflicts unless --force is passed)").option("--json", "Output sync report as JSON").action(async (opts) => {
    await handleSync(opts);
  });
  if (process.argv.length <= 2) {
    if (!isInteractiveTty()) {
      program.help();
      return;
    }
    const action = await promptMainMenu();
    if (action === "auth-backup") {
      const encrypt = await promptConfirm("Encrypt backup with AES-256-GCM passphrase?", false);
      await handleAuthBackup({ encrypt });
    } else if (action === "auth-import") {
      await handleAuthImport(void 0, {});
    } else if (action === "auth-status") {
      await handleAuthStatus({});
    } else if (action === "sync") {
      await handleSync({});
    }
    return;
  }
  await program.parseAsync(process.argv);
}
runCli().catch((err) => {
  const appErr = normalizeError(err);
  console.error(pc3.red(`[${appErr.code}] ${appErr.message}`));
  process.exit(appErr.exitCode);
});
