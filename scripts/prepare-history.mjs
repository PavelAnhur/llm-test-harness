import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const reportHistory = join('allure-report', 'history');
const resultsHistory = join('allure-results', 'history');

if (existsSync(reportHistory)) {
  mkdirSync('allure-results', { recursive: true });
  if (existsSync(resultsHistory)) {
    await import('node:fs/promises').then((fs) =>
      fs.rm(resultsHistory, { recursive: true, force: true })
    );
  }
  cpSync(reportHistory, resultsHistory, { recursive: true });
  console.log('✓ Restored history from allure-report/ into allure-results/');
} else {
  console.log('ℹ No previous history found. This run will start the trend chart.');
}
