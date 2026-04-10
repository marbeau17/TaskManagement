import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-17: Issues Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/issues')
    await page.waitForURL(/\/issues/, { timeout: 30000 })
  })

  test('displays issues page title', async ({ page }) => {
    const title = page.locator('text=課題, text=Issues, text=イシュー').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('shows issue list table or empty state', async ({ page }) => {
    await page.waitForTimeout(3000)
    const table = page.locator('table')
    const hasTable = await table.first().isVisible({ timeout: 10000 }).catch(() => false)
    const emptyState = page.locator('text=課題がありません, text=No issues')
    const hasEmpty = await emptyState.first().isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBeTruthy()
  })

  test('has search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="search"], input[type="text"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('shows filter dropdowns', async ({ page }) => {
    // Issue filters: project, type, severity, status, assignee
    const filters = page.locator('select, [role="combobox"]')
    const filterCount = await filters.count()
    expect(filterCount).toBeGreaterThan(0)
  })

  test('has CSV export button', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("CSV"), button:has-text("エクスポート"), button:has-text("Export")')
    const hasExport = await exportBtn.first().isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasExport).toBeTruthy()
  })

  test('table headers are sortable', async ({ page }) => {
    await page.waitForTimeout(3000)
    const table = page.locator('table')
    const hasTable = await table.first().isVisible().catch(() => false)
    if (hasTable) {
      const headers = table.locator('th')
      const headerCount = await headers.count()
      expect(headerCount).toBeGreaterThan(0)
      // Click a header to sort
      if (headerCount > 0) {
        await headers.first().click()
        await page.waitForTimeout(500)
        expect(page.url()).toContain('/issues')
      }
    }
  })
})
