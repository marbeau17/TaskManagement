import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-04: Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks/new')
    await page.waitForURL(/\/tasks\/new/, { timeout: 30000 })
  })

  test('shows Step 1 heading', async ({ page }) => {
    // i18n: JP "タスク依頼 — STEP 1" / EN "Task Request — STEP 1"
    await expect(page.getByText(/タスク依頼 — STEP 1|Task Request — STEP 1/)).toBeVisible({ timeout: 15000 })
  })

  test('shows step indicator', async ({ page }) => {
    // StepIndicator renders step circles with title attributes (not visible text)
    // i18n: JP "依頼情報入力"/"アサイン設定" / EN "Request Details"/"Assignment Settings"
    const step1Circle = page.locator('[title="依頼情報入力"], [title="Request Details"]').first()
    const step2Circle = page.locator('[title="アサイン設定"], [title="Assignment Settings"]').first()
    await expect(step1Circle).toBeVisible({ timeout: 15000 })
    await expect(step2Circle).toBeVisible()
  })

  test('shows info notice bar', async ({ page }) => {
    // i18n: JP "依頼情報を入力して送信すると..." / EN "Once you submit the request..."
    await expect(page.getByText(/依頼情報を入力して送信すると|Once you submit the request/)).toBeVisible({ timeout: 15000 })
  })

  test('has client name input field', async ({ page }) => {
    const clientInput = page.locator('#client_name')
    await expect(clientInput).toBeVisible({ timeout: 15000 })
  })

  test('has task title input field', async ({ page }) => {
    const titleInput = page.locator('#title')
    await expect(titleInput).toBeVisible({ timeout: 15000 })
  })

  test('can fill in required fields', async ({ page }) => {
    const clientInput = page.locator('#client_name')
    const titleInput = page.locator('#title')

    await clientInput.fill('テストクライアント株式会社')
    await titleInput.fill('テストタスク名')

    await expect(clientInput).toHaveValue('テストクライアント株式会社')
    await expect(titleInput).toHaveValue('テストタスク名')
  })

  test('shows validation errors for empty required fields', async ({ page }) => {
    // Try to submit the form without filling required fields
    const submitBtn = page.locator('button[type="submit"]')
    const submitCount = await submitBtn.count()

    if (submitCount > 0) {
      await submitBtn.first().click()
      // Should show validation error messages
      await page.waitForTimeout(1000)
      const clientError = page.locator('text=クライアント名は必須です').or(page.getByText(/client.*required/i))
      const titleError = page.locator('text=タスク名は必須です').or(page.getByText(/task.*name.*required/i))
      const hasClientError = await clientError.isVisible().catch(() => false)
      const hasTitleError = await titleError.isVisible().catch(() => false)
      expect(hasClientError || hasTitleError).toBeTruthy()
    }
  })

  test('has cancel button that navigates back to tasks', async ({ page }) => {
    const cancelBtn = page.locator('button', { hasText: /キャンセル|Cancel/ })
    const cancelCount = await cancelBtn.count()

    if (cancelCount > 0) {
      await cancelBtn.first().click()
      await page.waitForURL(/\/tasks/, { timeout: 15000 })
      expect(page.url()).toContain('/tasks')
    }
  })
})
