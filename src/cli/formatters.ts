import Table from 'cli-table3';
import pc from 'picocolors';
import type { SyncExecutionResult } from '../adapters/types.js';
import type { AuthStatusResult, AuthAccountMeta } from '../auth/types.js';

export function formatAccountSummary(account: AuthAccountMeta | null): string {
  if (!account) {
    return 'unknown account';
  }
  const emailPart = account.email ?? 'unknown email';
  const methodPart = account.authMethod ? ` (${account.authMethod})` : '';
  return `${emailPart}${methodPart}`;
}

export function printAuthStatus(status: AuthStatusResult): void {
  if (!status.authenticated) {
    console.log(pc.yellow('Not authenticated: no agy OAuth credential found in keyring or fallback file.'));
    return;
  }
  const table = new Table({
    head: [pc.cyan('Field'), pc.cyan('Value')],
  });
  table.push(
    ['Status', pc.green('Authenticated')],
    ['Storage', status.source ?? 'unknown'],
    ['Email', status.account?.email ?? '(unavailable)'],
    ['Auth Method', status.account?.authMethod ?? '(unknown)'],
    ['Token Expiry', status.account?.expiry ?? '(unknown)'],
  );
  console.log(table.toString());
}

export function printDiffText(diffText: string): void {
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      console.log(pc.green(line));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      console.log(pc.red(line));
    } else if (line.startsWith('@@')) {
      console.log(pc.cyan(line));
    } else {
      console.log(line);
    }
  }
}

function colorizeAction(action: string): string {
  switch (action) {
    case 'create':
      return pc.green('create');
    case 'update':
      return pc.yellow('update');
    case 'unchanged':
      return pc.dim('unchanged');
    case 'skipped':
      return pc.magenta('skipped');
    default:
      return action;
  }
}

export function printSyncResult(result: SyncExecutionResult, dryRun: boolean): void {
  console.log('');
  console.log(pc.bold(dryRun ? 'Sync Plan (Dry Run - No Changes Written):' : 'Sync Execution Summary:'));

  if (result.items.length === 0) {
    console.log(pc.yellow('No matching configuration items found for the selected categories and mode.'));
  } else {
    const itemsTable = new Table({
      head: [pc.cyan('Category'), pc.cyan('Item'), pc.cyan('Action'), pc.cyan('Target Path')],
    });
    for (const item of result.items) {
      itemsTable.push([item.category, item.itemName, colorizeAction(item.action), item.targetPath]);
    }
    console.log(itemsTable.toString());
  }

  const summaryTable = new Table({
    head: [pc.cyan('Created'), pc.cyan('Updated'), pc.cyan('Unchanged'), pc.cyan('Skipped'), pc.cyan('Backups'), pc.cyan('Warnings')],
  });
  summaryTable.push([
    pc.green(String(result.created)),
    pc.yellow(String(result.updated)),
    pc.dim(String(result.unchanged)),
    pc.magenta(String(result.skipped)),
    String(result.backups.length),
    result.issues.length > 0 ? pc.yellow(String(result.issues.length)) : '0',
  ]);
  console.log(summaryTable.toString());

  if (result.backups.length > 0) {
    console.log(pc.bold('\nBackups Created:'));
    for (const b of result.backups) {
      console.log(`  ${pc.dim(b.targetPath)} -> ${pc.cyan(b.backupPath)}`);
    }
  }

  if (result.issues.length > 0) {
    console.log(pc.bold('\nConversion Warnings & Skipped Items:'));
    const issueTable = new Table({
      head: [pc.cyan('Severity'), pc.cyan('Category'), pc.cyan('Item'), pc.cyan('Reason')],
    });
    for (const issue of result.issues) {
      const sev = issue.severity === 'skipped' ? pc.magenta('skipped') : pc.yellow('warning');
      issueTable.push([sev, issue.category, issue.item, issue.reason]);
    }
    console.log(issueTable.toString());
  }
}
