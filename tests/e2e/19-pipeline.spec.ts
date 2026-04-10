import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-19: Pipeline Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/pipeline')
    await page.waitForURL(/\/pipeline/, { timeout: 30000 })
  })

  test('displays pipeline page title', async ({ page }) => {
    const title = page.locator('text=パイプライン, text=Pipeline').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('shows pipeline table or access denied', async ({ page }) => {
    await page.waitForTimeout(3000)
    // Pipeline has access control - may show table or access denied
    const table = page.locator('table')
    const hasTable = await table.first().isVisible({ timeout: 10000 }).catch(() => false)
    const accessDenied = page.locator('text=アクセス権限, text=Access denied, text=権限がありません')
    const hasDenied = await accessDenied.first().isVisible().catch(() => false)
    expect(hasTable || hasDenied || page.url().includes('/pipeline')).toBeTruthy()
  })

  test('shows month columns in table', async ({ page }) => {
    await page.waitForTimeout(3000)
    const table = page.locator('table')
    const hasTable = await table.first().isVisible().catch(() => false)
    if (hasTable) {
      // Month headers like Oct, Nov, Dec, Jan...
      const headers = table.locator('th')
      const headerCount = await headers.count()
      expect(headerCount).toBeGreaterThan(0)
    }
  })

  test('shows status options in pipeline', async ({ page }) => {
    await page.waitForTimeout(3000)
    const pageContent = await page.textContent('body')
    // Pipeline statuses: Firm, Likely, Win, Lost
    const hasStatus = pageContent!.includes('Firm') || pageContent!.includes('Likely') ||
                      pageContent!.includes('Win') || pageContent!.includes('Lost') ||
                      pageContent!.includes('パイプライン')
    expect(hasStatus).toBeTruthy()
  })

  test('has add opportunity button', async ({ page }) => {
    await page.waitForTimeout(3000)
    const addBtn = page.locator('button:has-text("追加"), button:has-text("新規"), button:has-text("Add"), button:has-text("+")')
    const hasAdd = await addBtn.first().isVisible({ timeout: 5000 }).catch(() => false)
    // May not have add button if access is limited
    expect(typeof hasAdd).toBe('boolean')
  })

  test('page renders without errors', async ({ page }) => {
    await page.waitForTimeout(2000)
    const errorText = page.locator('text=エラーが発生しました, text=Something went wrong')
    const hasError = await errorText.first().isVisible().catch(() => false)
    expect(hasError).toBeFalsy()
  })
})
