import { expect, Page, test } from '@playwright/test';

const password = 'password123';

// A fresh account per test keeps the tests independent of each other.
function uniqueEmail(): string {
  return `tester-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function register(page: Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto('/login?mode=register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  return email;
}

test.describe('Landing page', () => {
  test('explains the product and links to sign-up', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('quality');
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Built with' })).toBeVisible();

    await page.getByRole('link', { name: 'Get started' }).first().click();
    await expect(page).toHaveURL(/\/login\?mode=register/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('registers a new user and lands on the projects page', async ({ page }) => {
    const email = await register(page);

    await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('rejects wrong credentials with a clear message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  });

  test('redirects anonymous visitors from protected pages to login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs out and returns to the landing page', async ({ page }) => {
    await register(page);
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/$/);
    // The landing page has a Log in link in the header and another in the hero, so scope to the header
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
  });
});

test.describe('Test management flow', () => {
  test('creates a project, adds test cases, records a run and sees the dashboard', async ({ page }) => {
    await register(page);

    // Project
    await page.getByLabel('Project name').fill('Checkout');
    await page.getByLabel('Description').fill('Web shop checkout flow');
    await page.getByRole('button', { name: 'Add project' }).click();
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await page.getByRole('link', { name: /Checkout/ }).click();

    // Test cases
    for (const title of ['Login works', 'Cart total is correct']) {
      await page.getByLabel('Test case title').fill(title);
      await page.getByRole('button', { name: 'Add test case' }).click();
      await expect(page.getByRole('cell', { name: title })).toBeVisible();
    }
    await expect(page.getByRole('tab', { name: 'Test cases (2)' })).toBeVisible();

    // Run: one pass, one fail
    await page.getByRole('tab', { name: 'Record a run' }).click();
    await page.getByLabel('Run name').fill('Release 1.0 regression');
    await page.getByLabel('Result for Cart total is correct').selectOption('fail');
    await page.getByRole('button', { name: 'Save run' }).click();

    // Dashboard opens after saving
    await expect(page.getByText('Pass rate')).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();

    // History lists the run
    await page.getByRole('tab', { name: /History/ }).click();
    await expect(page.getByRole('cell', { name: 'Release 1.0 regression' })).toBeVisible();
  });

  test('keeps one user’s projects private from another user', async ({ page, browser, baseURL }) => {
    await register(page);
    await page.getByLabel('Project name').fill('Private project');
    await page.getByRole('button', { name: 'Add project' }).click();
    await expect(page.getByRole('heading', { name: 'Private project' })).toBeVisible();

    // A second, separate browser session sees none of it
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await register(otherPage);
    await expect(otherPage.getByText('No projects yet')).toBeVisible();
    await other.close();
  });
});
