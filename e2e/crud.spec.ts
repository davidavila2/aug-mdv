import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/todos', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '101', todo: 'Mock A', completed: false },
          { id: '102', todo: 'Mock B', completed: true },
        ]),
      });
    } else {
      await route.continue();
    }
  });
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
  const todosUrl = 'http://localhost:3000/todos';
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;

  // Override GET/POST for /todos within this test to avoid DB writes and reflect the new item
  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = { id: '501', todo: body.todo, completed: body.completed };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

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
  const todosBaseUrl = 'http://localhost:3000/todos';

  // In-memory mock state
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;

  // Intercept collection endpoint for GET/POST
  await page.route(todosBaseUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = { id: '601', todo: body.todo, completed: body.completed };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

  // Intercept item endpoint for PUT (and optional GET by id if triggered)
  await page.route(/http:\/\/localhost:3000\/todos\/.+/, async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      if (createdTodo && body) {
        createdTodo = { ...createdTodo, ...body };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    await route.continue();
  });

  // Create a todo first (POST will be mocked)
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
  const todosUrl = 'http://localhost:3000/todos';
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;

  // Intercept collection and item endpoints
  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = { id: '701', todo: body.todo, completed: body.completed };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

  await page.route(/http:\/\/localhost:3000\/todos\/.+/, async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    await route.continue();
  });

  // Create a todo to view
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(text);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();

  // Select the created item
  const listItem = page
    .locator('.list-group-item')
    .filter({ hasText: text })
    .first();
  await expect(listItem).toBeVisible();

  // Prepare to assert detail GET and URL change
  const expectedId = '701';
  const getDetailPromise = page.waitForResponse((resp) => {
    return (
      resp.url().endsWith(`/todos/${expectedId}`) &&
      resp.request().method() === 'GET'
    );
  });

  // Click View button within the same list item
  await listItem.getByRole('button', { name: 'View' }).click();

  // URL should navigate to /todos/:id
  await expect(page).toHaveURL(new RegExp(`/todos/${expectedId}$`));

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
  const todosUrl = 'http://localhost:3000/todos';

  // In-memory mock state
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;
  let isDeleted = false;

  // Intercept collection endpoint for GET/POST
  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = { id: '801', todo: body.todo, completed: body.completed };
      isDeleted = false;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo && !isDeleted ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

  // Intercept item endpoint for DELETE
  await page.route(/http:\/\/localhost:3000\/todos\/.+/, async (route) => {
    const req = route.request();
    if (req.method() === 'DELETE') {
      isDeleted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '',
      });
      return;
    }
    await route.continue();
  });

  // Create a todo (POST mocked)
  const postResponsePromise = page.waitForResponse((resp) => {
    return resp.url().endsWith('/todos') && resp.request().method() === 'POST';
  });
  await page.getByLabel('Description').fill(text);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const postResponse = await postResponsePromise;
  await expect(postResponse.ok()).toBeTruthy();

  // Locate the list item and capture initial count (includes created item)
  const list = page.locator('.list-group-item');
  const initialCount = await list.count();
  const listItem = list.filter({ hasText: text }).first();
  await expect(listItem).toBeVisible();

  // Prepare DELETE assertion
  const deletePromise = page.waitForResponse((resp) => {
    return (
      resp.request().method() === 'DELETE' && /\/todos\/.+$/.test(resp.url())
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
  const todosUrl = 'http://localhost:3000/todos';
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;

  // Intercept GET/POST to keep state in-memory across reloads within this test
  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = { id: '901', todo: body.todo, completed: body.completed };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

  // Create a todo (POST mocked)
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

  // Reload and assert mocked GET /todos happens and includes the created item
  const getTodosPromise = page.waitForResponse((resp) => {
    return resp.request().method() === 'GET' && resp.url().endsWith('/todos');
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
  const todosUrl = 'http://localhost:3000/todos';

  // In-memory list for this test
  const base = [
    { id: '101', todo: 'Mock A', completed: false },
    { id: '102', todo: 'Mock B', completed: true },
  ];
  const created: { id: string; todo: string; completed: boolean }[] = [];
  let idCounter = 1001;

  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const newTodo = {
        id: String(idCounter++),
        todo: body.todo,
        completed: body.completed,
      };
      created.push(newTodo);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([...base, ...created]),
      });
      return;
    }
    await route.continue();
  });

  // Create first todo (Pending)
  const postFirst = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(firstText);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect((await postFirst).ok()).toBeTruthy();

  // Create second todo (Completed)
  const postSecond = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(secondText);
  await page.getByLabel('Completed').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect((await postSecond).ok()).toBeTruthy();

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
  const todosUrl = 'http://localhost:3000/todos';

  // Mock GET/POST/PUT with in-memory state
  let createdTodo: { id: string; todo: string; completed: boolean } | null =
    null;

  await page.route(todosUrl, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      createdTodo = {
        id: '1101',
        todo: body.todo,
        completed: !!body.completed,
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    if (req.method() === 'GET') {
      const base = [
        { id: '101', todo: 'Mock A', completed: false },
        { id: '102', todo: 'Mock B', completed: true },
      ];
      const list = createdTodo ? [...base, createdTodo] : base;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
      return;
    }
    await route.continue();
  });

  await page.route(/http:\/\/localhost:3000\/todos\/.+/, async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      if (createdTodo) {
        createdTodo = { ...createdTodo, ...body };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdTodo),
      });
      return;
    }
    await route.continue();
  });

  // Create a todo to edit (POST mocked)
  const postPromise = page.waitForResponse(
    (resp) =>
      resp.url().endsWith('/todos') && resp.request().method() === 'POST'
  );
  await page.getByLabel('Description').fill(originalText);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect((await postPromise).ok()).toBeTruthy();

  // Select the created item
  const item = page
    .locator('.list-group-item')
    .filter({ hasText: originalText })
    .first();
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.getByRole('heading', { name: 'Edit Todo' })).toBeVisible();
  await expect(item).toHaveClass(/active/);

  // Update and save (PUT mocked)
  await page.getByLabel('Description').fill(updatedText);
  const putPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/todos/') && resp.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Save' }).click();
  await expect((await putPromise).ok()).toBeTruthy();

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
