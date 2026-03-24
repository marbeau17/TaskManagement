import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-03: Task List and Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
  })

  test('displays task list page title', async ({ page }) => {
    // Title is inside Topbar's h1 element
    const title = page.locator('h1').filter({ hasText: 'タスク一覧' }).or(
      page.locator('header').filter({ hasText: 'タスク一覧' })
    ).first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('task table is visible after loading', async ({ page }) => {
    // Wait for loading to finish (the "読み込み中..." text should disappear)
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {
      // May have loaded already
    })
    // The task table card should be visible
    const tableCard = page.locator('[class*="bg-surface"][class*="rounded"]').first()
    await expect(tableCard).toBeVisible({ timeout: 15000 })
  })

  test('has status filter tabs', async ({ page }) => {
    // TaskStatusTabs renders status buttons; look for common status labels
    await page.waitForTimeout(2000) // Allow data to load
    // At least "すべて" or similar tab should exist
    const allTab = page.locator('button', { hasText: /すべて|全て/ })
    const hasAllTab = await allTab.count()
    // Status tabs may show counts like "進行中 (3)"
    const inProgressTab = page.locator('button', { hasText: '進行中' })
    const hasInProgress = await inProgressTab.count()
    expect(hasAllTab + hasInProgress).toBeGreaterThan(0)
  })

  test('has filter inputs', async ({ page }) => {
    // TaskFilters component renders search/filter controls
    await page.waitForTimeout(1000)
    // Look for any input or select in the filter area
    const filterInputs = page.locator('input[placeholder], select')
    const count = await filterInputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('has CSV export button', async ({ page }) => {
    const csvBtn = page.locator('button', { hasText: 'CSV出力' })
    await expect(csvBtn).toBeVisible({ timeout: 15000 })
  })

  test('has new task button', async ({ page }) => {
    // The "new task" element is a Link (anchor), not a button
    const newTaskLink = page.locator('a[href="/tasks/new"]').first()
    await expect(newTaskLink).toBeVisible({ timeout: 15000 })
  })

  test('clicking a task row navigates to task detail', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Find a clickable task row (link to /tasks/[id])
    const taskLink = page.locator('a[href*="/tasks/"]').first()
    const taskLinkCount = await taskLink.count()

    if (taskLinkCount > 0) {
      await taskLink.click()
      await page.waitForURL(/\/tasks\/[^/]+/, { timeout: 15000 })
      expect(page.url()).toMatch(/\/tasks\/[^/]+/)
    } else {
      // If there are clickable rows (tr or div), try clicking
      const taskRow = page.locator('table tbody tr, [class*="cursor-pointer"]').first()
      const rowCount = await taskRow.count()
      if (rowCount > 0) {
        await taskRow.click()
        await page.waitForTimeout(3000)
      }
      // If no tasks exist, skip gracefully
      test.skip(rowCount === 0, 'No task rows available to click')
    }
  })

  test('task detail page shows expected sections', async ({ page }) => {
    // Wait for tasks to load, then navigate to first task
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    // Find task links - exclude /tasks/new which is the create link
    const taskLinks = page.locator('a[href*="/tasks/"]').filter({
      hasNot: page.locator('text=タスク依頼'),
    })
    // Also try to find links that go to task detail (UUID pattern)
    const detailLinks = page.locator('a[href*="/tasks/"]')
    const allLinks = await detailLinks.all()
    let detailLink = null
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      if (href && href !== '/tasks/new' && href !== '/tasks' && href.match(/\/tasks\/[^/]+/)) {
        detailLink = link
        break
      }
    }

    if (!detailLink) {
      test.skip(true, 'No tasks available for detail view')
      return
    }

    await detailLink.click()
    await page.waitForURL(/\/tasks\/[^/]+/, { timeout: 15000 })

    // Task detail should show back button with "一覧に戻る"
    await expect(page.locator('text=一覧に戻る')).toBeVisible({ timeout: 15000 })

    // Task title in h1
    const titleEl = page.locator('h1')
    await expect(titleEl).toBeVisible()

    // Action buttons: "差し戻し" and "✓ 完了にする"
    await expect(page.locator('button', { hasText: '差し戻し' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button', { hasText: '完了にする' })).toBeVisible({ timeout: 10000 })
  })
})
