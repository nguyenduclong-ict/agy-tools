import { spawn } from 'node:child_process';
import { AppError } from '../../core/errors.js';
import { KEYRING_ACCOUNT, WINDOWS_CRED_TARGET, type KeyringAdapter } from './types.js';

const WIN32_CSHARP = `
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

function runPowerShell(script: string, extraEnv: Record<string, string> = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...extraEnv },
        windowsHide: true,
      },
    );

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => stdoutChunks.push(d));
    child.stderr.on('data', (d: Buffer) => stderrChunks.push(d));
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

/**
 * Windows Credential Manager adapter using Win32 CredReadW/CredWriteW via PowerShell.
 */
export class WindowsKeyringAdapter implements KeyringAdapter {
  public readonly sourceKind = 'keyring' as const;

  public async isAvailable(): Promise<boolean> {
    return process.platform === 'win32';
  }

  public async read(): Promise<string | null> {
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
      throw new AppError('AUTH_KEYRING_UNAVAILABLE', `Windows Credential Manager read failed: ${res.stderr.trim()}`);
    }
    const line = res.stdout.trim();
    if (line === '__AGY_NOT_FOUND__') {
      return null;
    }
    if (line.startsWith('__AGY_B64__:')) {
      const b64 = line.slice('__AGY_B64__:'.length);
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    throw new AppError('AUTH_KEYRING_UNAVAILABLE', 'Unexpected output from Windows Credential Manager.');
  }

  public async write(payloadUtf8: string): Promise<void> {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
${WIN32_CSHARP}
'@
$payload = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:AGY_TOOLS_CRED_B64))
[AgyCredStore]::WriteUtf8('${WINDOWS_CRED_TARGET}', '${KEYRING_ACCOUNT}', $payload)
`;
    const b64 = Buffer.from(payloadUtf8, 'utf8').toString('base64');
    const res = await runPowerShell(script, { AGY_TOOLS_CRED_B64: b64 });
    if (res.code !== 0) {
      throw new AppError('AUTH_KEYRING_UNAVAILABLE', `Windows Credential Manager write failed: ${res.stderr.trim()}`);
    }
  }
}
