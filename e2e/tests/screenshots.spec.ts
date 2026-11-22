import path from 'path';
import { expect, test } from '@playwright/test';

// Not part of the normal test run (see testIgnore in playwright.config.ts).
// The "Screenshots" workflow runs it to refresh the images used in the README.

const API = process.env.API_URL ?? 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const shot = (name: string) => path.join(OUT, name);

test.use({ viewport: { width: 1280, height: 800 } });

const sampleCases: Array<[string, 'low' | 'medium' | 'high', string]> = [
  ['Guest can add an item to the cart', 'high', 'Cart shows the item and the correct total'],
  ['Cart total updates when quantity changes', 'high', 'Total equals price times quantity'],
  ['Checkout requires a shipping address', 'medium', 'Validation message is shown for empty fields'],
  ['Card payment succeeds with a valid card', 'high', 'Order confirmation page is displayed'],
  ['Declined card shows a clear error', 'medium', 'User stays on the payment step with an error message'],
  ['Order appears in order history', 'low', 'New order is listed with the right status'],
];

test('capture screenshots for the README', async ({ page, request, context }) => {
  test.setTimeout(120_000);

  // Sample data created through the API
  const email = `demo-${Date.now()}@example.com`;
  const reg = await request.post(`${API}/api/auth/register`, { data: { email, password: 'password123' } });
  expect(reg.ok()).toBeTruthy();
  const { token } = await reg.json();
  const headers = { Authorization: `Bearer ${token}` };

  const projectRes = await request.post(`${API}/api/projects`, {
    headers,
    data: { name: 'Checkout flow', description: 'Regression tests for the web shop checkout' },
  });
  const project = await projectRes.json();

  const ids: number[] = [];
  for (const [title, priority, expected] of sampleCases) {
    const r = await request.post(`${API}/api/projects/${project.id}/testcases`, {
      headers,
      data: { title, priority, expected },
    });
    ids.push((await r.json()).id);
  }

  const runs: Array<[string, Array<'pass' | 'fail' | 'blocked'>]> = [
    ['Sprint 1 regression', ['pass', 'pass', 'fail', 'fail', 'blocked', 'pass']],
    ['Sprint 2 regression', ['pass', 'pass', 'pass', 'fail', 'pass', 'pass']],
  ];
  for (const [name, statuses] of runs) {
    const r = await request.post(`${API}/api/projects/${project.id}/runs`, {
      headers,
      data: { name, results: ids.map((id, i) => ({ testCaseId: id, status: statuses[i] })) },
    });
    expect(r.ok()).toBeTruthy();
  }

  // 1. Landing page
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: shot('01-landing.png'), fullPage: true });

  // 2. Sign-up
  await page.goto('/login?mode=register');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.screenshot({ path: shot('02-sign-up.png') });

  // Sign in by storing the token the app reads at start-up
  await context.addInitScript((t) => window.localStorage.setItem('testtrack_token', t), token);

  // 3. Projects
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Checkout flow' })).toBeVisible();
  await page.screenshot({ path: shot('03-projects.png') });

  // 4. Test cases
  await page.getByRole('link', { name: /Checkout flow/ }).click();
  await expect(page.getByRole('tab', { name: /Test cases \(6\)/ })).toBeVisible();
  await page.screenshot({ path: shot('04-test-cases.png'), fullPage: true });

  // 5. Recording a run
  await page.getByRole('tab', { name: 'Record a run' }).click();
  await page.getByLabel('Run name').fill('Sprint 3 regression');
  await page.screenshot({ path: shot('05-record-run.png'), fullPage: true });

  // 6. History
  await page.getByRole('tab', { name: /History/ }).click();
  await expect(page.getByRole('cell', { name: 'Sprint 1 regression' })).toBeVisible();
  await page.screenshot({ path: shot('06-history.png') });

  // 7. Dashboard
  await page.getByRole('tab', { name: 'Dashboard' }).click();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
  await page.waitForTimeout(1500); // let the chart animation finish
  await page.screenshot({ path: shot('07-dashboard.png'), fullPage: true });

  // 8. API documentation served by the back end
  await page.goto(`${API}/docs`);
  await expect(page.locator('.swagger-ui').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('08-api-docs.png') });
});
