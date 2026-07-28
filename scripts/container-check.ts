import * as http from 'node:http';
import * as https from 'node:https';
import type { IncomingMessage } from 'node:http';

const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:3000';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

function makeRequest(url: string, timeoutMs: number = 5000): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        agent: false,
        timeout: timeoutMs,
      },
      (res: IncomingMessage) => {
        let body = '';

        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });

        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body });
        });

        res.on('error', (err: Error) => {
          reject(err);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (err: Error) => {
      reject(err);
    });

    req.end();
  });
}

async function checkEndpoint(
  path: string,
  expectedStatus: number,
  validateBody?: (body: unknown) => boolean
): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;

  try {
    const { status, body } = await makeRequest(url);

    if (status !== expectedStatus) {
      return {
        name: path,
        passed: false,
        message: `Expected status ${expectedStatus}, got ${status}`,
      };
    }

    if (validateBody) {
      const parsedBody = JSON.parse(body);
      if (!validateBody(parsedBody)) {
        return {
          name: path,
          passed: false,
          message: 'Body validation failed',
        };
      }
    }

    return {
      name: path,
      passed: true,
      message: `✓ ${path} → ${status}`,
    };
  } catch (error) {
    return {
      name: path,
      passed: false,
      message: `Failed to connect: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

async function checkStaticAsset(path: string, expectedContent: string): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;

  try {
    const { status, body } = await makeRequest(url);

    if (status !== 200) {
      return {
        name: path,
        passed: false,
        message: `Expected status 200, got ${status}`,
      };
    }

    if (!body.includes(expectedContent)) {
      return {
        name: path,
        passed: false,
        message: 'Content validation failed',
      };
    }

    return {
      name: path,
      passed: true,
      message: `✓ ${path} → 200 (static asset verified)`,
    };
  } catch (error) {
    return {
      name: path,
      passed: false,
      message: `Failed to connect: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

async function main() {
  console.log(`Checking container at ${BASE_URL}\n`);

  const results: CheckResult[] = [];

  // Check /api/health
  results.push(
    await checkEndpoint('/api/health', 200, (body) => {
      const b = body as { status?: string; service?: string };
      return b.status === 'ok' && b.service === 'nj-worktrace';
    })
  );

  // Check /api/ready
  results.push(
    await checkEndpoint('/api/ready', 200, (body) => {
      const b = body as { status?: string; service?: string; database?: string };
      return b.status === 'ok' && b.service === 'nj-worktrace' && b.database === 'ok';
    })
  );

  // Check static asset
  results.push(
    await checkStaticAsset('/container-check.txt', 'nj-worktrace container static asset')
  );

  console.log('Results:');
  results.forEach((r) => console.log(`  ${r.message}`));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\n${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('\n✓ All checks passed');
  } else {
    console.log('\n✗ Some checks failed');
    process.exitCode = 1;
  }
}

main();
