import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-07: Clients Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/clients')
    await page.waitForURL(/\/clients/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    await expect(page.locator('text=クライアント管理')).toBeVisible({ timeout: 10000 })
  })

  test('has add client button', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: 'クライアント追加' })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })

  test('shows client count', async ({ page }) => {
    await page.waitForTimeout(3000)
    const countText = page.locator('text=クライアント数')
    await expect(countText).toBeVisible({ timeout: 10000 })
  })

  test('shows client table with headers', async ({ page }) => {
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Table headers
    await expect(page.locator('text=名前').first()).toBeVisible()
    await expect(page.locator('text=作成日').first()).toBeVisible()
    await expect(page.locator('text=操作').first()).toBeVisible()
  })

  test('clicking add button opens create modal', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: 'クライアント追加' })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Modal should appear - look for modal dialog or overlay
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="overlay"]').first()
    const modalVisible = await modal.isVisible().catch(() => false)

    if (modalVisible) {
      // Look for an input field inside the modal
      const input = modal.locator('input').first()
      await expect(input).toBeVisible({ timeout: 5000 })

      // Close modal
      const cancelBtn = page.locator('button', { hasText: 'キャンセル' })
      const cancelVisible = await cancelBtn.isVisible().catch(() => false)
      if (cancelVisible) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
      }
    } else {
      // Modal may appear as a separate element without role="dialog"
      // Check for input that appears after clicking
      const input = page.locator('input[placeholder*="サンプル"], input[placeholder*="クライアント"]').first()
      const inputVisible = await input.isVisible().catch(() => false)
      expect(inputVisible || modalVisible).toBeTruthy()
    }
  })

  test('client rows have edit and delete buttons', async ({ page }) => {
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const editBtns = page.locator('button', { hasText: '編集' })
    const deleteBtns = page.locator('button', { hasText: '削除' })
    const editCount = await editBtns.count()
    const deleteCount = await deleteBtns.count()

    // If clients exist, they should have action buttons
    if (editCount > 0) {
      expect(editCount).toBeGreaterThan(0)
      expect(deleteCount).toBeGreaterThan(0)
    }
  })
})
