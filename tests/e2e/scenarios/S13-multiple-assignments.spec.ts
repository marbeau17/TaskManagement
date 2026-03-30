import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S13: Multiple Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S13-01: Task detail shows assignee info', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })
    await page.click('table tbody tr:first-child')
    await page.waitForSelector('text=アサイン情報', { timeout: 15000 })

    const assignSection = page.locator('text=アサイン情報')
    await expect(assignSection).toBeVisible()
  })

  test('S13-02: Assign change button exists', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })
    await page.click('table tbody tr:first-child')
    await page.waitForSelector('text=アサイン変更', { timeout: 15000 })

    const assignBtn = page.locator('text=アサイン変更')
    await expect(assignBtn).toBeVisible()
  })

  test('S13-03: Task list shows assignee column', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })

    // Check assignee column header exists
    const headers = page.locator('th')
    const headerTexts = await headers.allTextContents()
    const hasAssignee = headerTexts.some(h => h.includes('担当') || h.includes('Assignee'))
    expect(hasAssignee).toBe(true)
  })

  test('S13-04: Bulk assign via selection', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })

    // Check that checkboxes exist for selection
    const checkboxes = page.locator('table input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
  })

  test('S13-05: Workload page shows all members', async ({ page }) => {
    await page.goto('/workload')
    await page.waitForSelector('table, [class*="grid"]', { timeout: 15000 })

    // Verify workload page loads
    await expect(page.locator('text=稼働')).toBeVisible()
  })
})
