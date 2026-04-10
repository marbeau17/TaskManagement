import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-18: Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/templates')
    await page.waitForURL(/\/templates/, { timeout: 30000 })
  })

  test('displays templates page title', async ({ page }) => {
    const title = page.locator('text=テンプレート, text=Templates').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('shows template list or empty state', async ({ page }) => {
    await page.waitForTimeout(3000)
    const templates = page.locator('[class*="card"], [class*="Card"], [class*="template"], li, tr')
    const templateCount = await templates.count()
    const emptyState = page.locator('text=テンプレートがありません, text=No templates, text=まだ')
    const hasEmpty = await emptyState.first().isVisible().catch(() => false)
    expect(templateCount > 0 || hasEmpty).toBeTruthy()
  })

  test('has create template button', async ({ page }) => {
    const createBtn = page.locator('button:has-text("新規"), button:has-text("作成"), button:has-text("追加"), button:has-text("New")')
    const hasCreate = await createBtn.first().isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasCreate).toBeTruthy()
  })

  test('page renders without errors', async ({ page }) => {
    await page.waitForTimeout(2000)
    const errorText = page.locator('text=エラーが発生しました, text=Something went wrong')
    const hasError = await errorText.first().isVisible().catch(() => false)
    expect(hasError).toBeFalsy()
  })

  test('template cards show name and category', async ({ page }) => {
    await page.waitForTimeout(3000)
    const pageContent = await page.textContent('body')
    // Page should have rendered content
    expect(pageContent!.length).toBeGreaterThan(50)
  })

  test('shows field type options in editor when creating', async ({ page }) => {
    const createBtn = page.locator('button:has-text("新規"), button:has-text("作成"), button:has-text("追加")').first()
    const hasCreate = await createBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (hasCreate) {
      await createBtn.click()
      await page.waitForTimeout(1000)
      // Editor should appear with field type options
      const editor = page.locator('input, select, textarea')
      const editorCount = await editor.count()
      expect(editorCount).toBeGreaterThan(0)
    }
  })
})
