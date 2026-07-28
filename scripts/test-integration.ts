import { spawn } from 'child_process';

async function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: process.platform === 'win32',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('=== Preparing test database ===');
  await runCommand('pnpm', ['db:test:reset']);

  console.log('\n=== Running integration tests ===');
  await runCommand('vitest', ['run', '--config', 'vitest.integration.config.ts']);
}

main().catch((error) => {
  console.error('✗ Integration test runner failed:', error);
  process.exit(1);
});
