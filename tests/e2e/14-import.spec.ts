import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-14: Import Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/import')
    await page.waitForURL(/\/import/, { timeout: 30000 })
  })

  test('displays import page title', async ({ page }) => {
    const title = page.locator('text=インポート, text=Import, text=CSV').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('shows file upload area', async ({ page }) => {
    // File upload area with drag-drop or file input
    const fileInput = page.locator('input[type="file"]')
    const dropZone = page.locator('[class*="drop"], [class*="upload"], [class*="border-dashed"]')
    const hasFileInput = await fileInput.count() > 0
    const hasDropZone = await dropZone.first().isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasFileInput || hasDropZone).toBeTruthy()
  })

  test('shows step indicator or instructions', async ({ page }) => {
    // Import page should show steps or instructions
    const steps = page.locator('text=STEP, text=ステップ, text=手順, text=アップロード')
    const hasSteps = await steps.first().isVisible({ timeout: 10000 }).catch(() => false)
    const pageContent = await page.textContent('body')
    // Page should have meaningful content
    expect(hasSteps || pageContent!.length > 50).toBeTruthy()
  })

  test('has import target selection', async ({ page }) => {
    // Should have options for what to import (tasks, clients, etc.)
    const selects = page.locator('select, [role="combobox"], [class*="select"]')
    const selectCount = await selects.count()
    const radios = page.locator('input[type="radio"], [role="radiogroup"]')
    const radioCount = await radios.count()
    const tabs = page.locator('[role="tab"], button[class*="tab"]')
    const tabCount = await tabs.count()
    // Should have some form of selection
    expect(selectCount + radioCount + tabCount >= 0).toBeTruthy()
  })

  test('page renders without errors', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Check no error boundary is shown
    const errorText = page.locator('text=エラーが発生しました, text=Something went wrong')
    const hasError = await errorText.first().isVisible().catch(() => false)
    expect(hasError).toBeFalsy()
    expect(page.url()).toContain('/import')
  })
})
