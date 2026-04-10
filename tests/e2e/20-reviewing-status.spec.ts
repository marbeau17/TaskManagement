import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('WEB-36: Reviewing (確認中) task status', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('task list page shows reviewing tab', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })

    // Wait for loading to finish
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // TaskStatusTabs should include a "確認中" tab button
    const reviewingTab = page.locator('button', { hasText: '確認中' })
    await expect(reviewingTab).toBeVisible({ timeout: 15000 })
  })

  test('kanban board has reviewing column', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })

    // Wait for loading to finish
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // Switch to Kanban view — look for a toggle button with kanban-related text or icon
    const kanbanToggle = page.locator('button', { hasText: /カンバン|Kanban/i })
      .or(page.locator('button[aria-label*="kanban" i]'))
      .or(page.locator('button[title*="カンバン"]'))
    const hasKanbanToggle = await kanbanToggle.count()

    if (hasKanbanToggle > 0) {
      await kanbanToggle.first().click()
      await page.waitForTimeout(2000)
    } else {
      // Try navigating directly to kanban view
      await page.goto('/tasks?view=kanban')
      await page.waitForTimeout(3000)
    }

    // The Kanban board should have a column header for "確認中"
    const reviewingColumn = page.locator('text=確認中')
    await expect(reviewingColumn.first()).toBeVisible({ timeout: 15000 })
  })

  test('task detail shows reviewing status option', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })

    // Wait for tasks to load
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    // Navigate to first available task detail
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
    await page.waitForTimeout(2000)

    // Look for the status selector (select, dropdown, or badge)
    // The status field should contain "確認中" as an option
    const statusSelect = page.locator('select').filter({ has: page.locator('option[value="reviewing"]') })
    const statusSelectCount = await statusSelect.count()

    if (statusSelectCount > 0) {
      // Native select — verify the reviewing option exists
      const option = statusSelect.first().locator('option[value="reviewing"]')
      await expect(option).toHaveCount(1)
    } else {
      // Custom dropdown — look for a status-related element and click it
      const statusArea = page.locator('[class*="status"], [data-field="status"]')
        .or(page.locator('text=ステータス').locator('..'))
      const statusAreaCount = await statusArea.count()

      if (statusAreaCount > 0) {
        // Click to open dropdown
        await statusArea.first().click()
        await page.waitForTimeout(1000)
      }

      // After opening, look for "確認中" in the dropdown options
      const reviewingOption = page.locator('text=確認中')
      const found = await reviewingOption.count()
      expect(found).toBeGreaterThan(0)
    }
  })
})
