import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4200/todos');
});

test('landing shows list and form with Save disabled', async ({ page }) => {
  // List component should be present
  await expect(page.locator('app-todo-list').first()).toBeVisible();

  // Form heading should indicate New Todo on initial load
  await expect(page.getByRole('heading', { name: 'New Todo' })).toBeVisible();

  // Description input should be present
  await expect(page.getByLabel('Description')).toBeVisible();

  // Save should be disabled when form is invalid (empty description)
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('create todo (happy path)', async ({ page }) => {
  const uniqueText = `Buy milk`;

  const responsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });

  await page.getByLabel('Description').fill(uniqueText);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();

  const response = await responsePromise;
  await expect(response.ok()).toBeTruthy();

  // Verify item appears in the list with Completed status
  const item = page
    .locator('.list-group-item')
    .filter({ hasText: uniqueText })
    .first();
  await expect(item).toBeVisible();
  await expect(item).toContainText('Completed');
});

test('update todo after selecting from list', async ({ page }) => {
  const originalText = 'Buy milk';
  const updatedText = 'Buy bread';

  // Ensure a todo exists to edit by creating one first
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(originalText);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();

  // Select the newly created todo to enter edit mode
  const listItem = page
    .locator('.list-group-item')
    .filter({ hasText: originalText })
    .first();
  await expect(listItem).toBeVisible();
  await listItem.click();

  // Heading should change to Edit Todo
  await expect(page.getByRole('heading', { name: 'Edit Todo' })).toBeVisible();

  // Update fields
  await page.getByLabel('Description').fill(updatedText);
  await page.getByLabel('Completed').uncheck();

  const putResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes('/todos/') && resp.request().method() === 'PUT';
  });
  await page.getByRole('button', { name: 'Save' }).click();
  const putResponse = await putResponsePromise;
  await expect(putResponse.ok()).toBeTruthy();

  // Verify list reflects updates
  const updatedItem = page
    .locator('.list-group-item')
    .filter({ hasText: updatedText })
    .first();
  await expect(updatedItem).toBeVisible();
  await expect(updatedItem).toContainText('Pending');
});

test('view details and return to list', async ({ page }) => {
  const text = 'Buy milk';

  // Create a todo to view and assert POST payload/response
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(text);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();

  const postRequest = postResponse.request();
  const postedBody = JSON.parse(postRequest.postData() ?? '{}');
  expect(postedBody).toMatchObject({ todo: text, completed: true });

  const created = await postResponse.json();
  expect(created).toMatchObject({ todo: text, completed: true });
  const createdId = created.id as string;
  expect(createdId).toBeDefined();

  const listItem = page
    .locator('.list-group-item')
    .filter({ hasText: text })
    .first();
  await expect(listItem).toBeVisible();

  // Click View button within the same list item
  await listItem.getByRole('button', { name: 'View' }).click();

  // Prepare to assert detail GET and URL change
  const getDetailPromise = page.waitForResponse((resp) => {
    return (
      resp.url().endsWith(`/todos/${createdId}`) &&
      resp.request().method() === 'GET'
    );
  });

  // URL should navigate to /todos/:id
  await expect(page).toHaveURL(new RegExp(`/todos/${createdId}$`));

  // Details page assertions
  await expect(
    page.getByRole('heading', { name: 'Todo Details' })
  ).toBeVisible();
  await expect(page.locator('.todo-text')).toHaveText(text);
  await expect(page.locator('.badge')).toHaveText('Completed');

  // Ensure GET detail call succeeded
  const getDetailResponse = await getDetailPromise;
  await expect(getDetailResponse.ok()).toBeTruthy();

  // Navigate back and assert URL
  await page.getByRole('button', { name: 'Back to List' }).click();
  await expect(page).toHaveURL(new RegExp(`/todos$`));
  await expect(page.locator('app-todo-list').first()).toBeVisible();
});

test('delete todo from list', async ({ page }) => {
  const text = 'Buy milk';

  // Create a todo to delete and capture its id
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(text);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();
  const created = await postResponse.json();
  const createdId = created.id as string;
  expect(createdId).toBeDefined();

  // Locate the list item and capture initial count
  const list = page.locator('.list-group-item');
  const initialCount = await list.count();
  const listItem = list.filter({ hasText: text }).first();
  await expect(listItem).toBeVisible();

  // Prepare DELETE assertion
  const deletePromise = page.waitForResponse((resp) => {
    return (
      resp.url().endsWith(`/todos/${createdId}`) &&
      resp.request().method() === 'DELETE'
    );
  });

  // Click Delete within the item's actions
  await listItem.getByRole('button', { name: 'Delete' }).click();

  const deleteResponse = await deletePromise;
  await expect(deleteResponse.ok()).toBeTruthy();

  // The item should disappear and the list count should decrease by 1
  await expect(page.locator('.list-group-item')).toHaveCount(initialCount - 1);
  await expect(listItem).toHaveCount(0);
});

test('persistence on reload: created todo remains after page reload', async ({
  page,
}) => {
  const text = 'Buy milk';

  // Create a todo and assert POST ok
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(text);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();

  // Ensure it is visible before reload
  const createdItem = page
    .locator('.list-group-item')
    .filter({ hasText: text })
    .first();
  await expect(createdItem).toBeVisible();

  // Reload and assert GET /todos happens
  const getTodosPromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'GET';
  });
  await page.reload();
  const getTodosResponse = await getTodosPromise;
  await expect(getTodosResponse.ok()).toBeTruthy();

  // Verify the todo persists and status badge remains
  const persistedItem = page
    .locator('.list-group-item')
    .filter({ hasText: text })
    .first();
  await expect(persistedItem).toBeVisible();
  await expect(persistedItem).toContainText('Completed');

  // Verify form resets to New Todo state on reload
  await expect(page.getByRole('heading', { name: 'New Todo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('reset form clears inputs and does not create a todo', async ({
  page,
}) => {
  // Ensure initial list count
  const list = page.locator('.list-group-item');
  const initialCount = await list.count();

  // Fill description and check completed
  await page.getByLabel('Description').fill('Temporary task');
  await page.getByLabel('Completed').check();

  // Click Reset
  await page.getByRole('button', { name: 'Reset' }).click();

  // Fields should be cleared and Save disabled
  await expect(page.getByLabel('Description')).toHaveValue('');
  await expect(page.getByLabel('Completed')).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

  // No item should have been added
  await expect(list).toHaveCount(initialCount);
});

test('selecting a todo highlights it and populates edit form', async ({
  page,
}) => {
  const firstText = 'Alpha task'; // will be Pending
  const secondText = 'Beta task'; // will be Completed

  // Create first todo (Pending)
  const postFirst = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(firstText);
  // leave Completed unchecked
  await page.getByRole('button', { name: 'Save' }).click();
  const firstResp = await postFirst;
  await expect(firstResp.ok()).toBeTruthy();

  // Create second todo (Completed)
  const postSecond = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(secondText);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const secondResp = await postSecond;
  await expect(secondResp.ok()).toBeTruthy();

  // Select the second todo
  const secondItem = page
    .locator('.list-group-item')
    .filter({ hasText: secondText })
    .first();
  await expect(secondItem).toBeVisible();
  await secondItem.click();

  // Form switches to Edit and is populated
  await expect(page.getByRole('heading', { name: 'Edit Todo' })).toBeVisible();
  await expect(page.getByLabel('Description')).toHaveValue(secondText);
  await expect(page.getByLabel('Completed')).toBeChecked();

  // Selected list item has active class
  await expect(secondItem).toHaveClass(/active/);
});

test('after saving an edit, form resets and selection clears', async ({
  page,
}) => {
  const originalText = 'Gamma task';
  const updatedText = 'Gamma task updated';

  // Create a todo to edit
  const postPromise = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(originalText);
  await page.getByRole('button', { name: 'Save' }).click();
  const postResp = await postPromise;
  await expect(postResp.ok()).toBeTruthy();

  // Select the created item
  const item = page
    .locator('.list-group-item')
    .filter({ hasText: originalText })
    .first();
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.getByRole('heading', { name: 'Edit Todo' })).toBeVisible();
  await expect(item).toHaveClass(/active/);

  // Update and save
  await page.getByLabel('Description').fill(updatedText);
  const putPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/todos/') && resp.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Save' }).click();
  const putResp = await putPromise;
  await expect(putResp.ok()).toBeTruthy();

  // After save, form should reset to New Todo and fields cleared
  await expect(page.getByRole('heading', { name: 'New Todo' })).toBeVisible();
  await expect(page.getByLabel('Description')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

  // Selection highlight should be cleared
  await expect(item).not.toHaveClass(/active/);

  // Updated item should be present with updated text
  const updatedItem = page
    .locator('.list-group-item')
    .filter({ hasText: updatedText })
    .first();
  await expect(updatedItem).toBeVisible();
});
