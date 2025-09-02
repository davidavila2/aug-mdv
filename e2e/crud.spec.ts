import { test, expect } from '@playwright/test';

// test.beforeEach(async ({ page }) => {
//   await page.goto('http://localhost:4200/todos');
// });

test('has heading', async ({ page }) => {
  await page.route('http://localhost:3000/todos', async (route) => {
    const json = [
      {
        id: '1',
        todo: 'Learn React',
        completed: false,
      },
    ];
    await route.fulfill({ json });
  });

  await page.goto('http://localhost:4200/todos');

  const heading = page.getByRole('heading', { name: 'Edit Todo' });
  await expect(heading).toBeVisible();
});

test('create todo', async ({ page }) => {
  await page.route('http://localhost:3000/todos', async (route) => {
    const json = [
      {
        id: '1',
        todo: 'Learn React',
        completed: false,
      },
    ];
    await route.fulfill({ json });
  });

  await page.goto('http://localhost:4200/todos');

  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('test');
  await page.locator('label').filter({ hasText: 'Completed' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  const response = await page.request.post('http://localhost:3000/todos');

  await expect(page.getByText('test')).toBeVisible();
});
