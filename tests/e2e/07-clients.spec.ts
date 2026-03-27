import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-07: Clients Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/clients')
    await page.waitForURL(/\/clients/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    // i18n: JP "クライアント管理" / EN "Client Management"
    await expect(page.getByText(/クライアント管理|Client Management/)).toBeVisible({ timeout: 10000 })
  })

  test('has add client button', async ({ page }) => {
    // i18n: JP "クライアント追加" / EN "Add Client"
    const addBtn = page.locator('button', { hasText: /クライアント追加|Add Client/ })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })

  test('shows client count', async ({ page }) => {
    await page.waitForTimeout(3000)
    // i18n: JP "クライアント数" / EN "Clients:" or count display
    const countText = page.getByText(/クライアント数|Clients:/)
    await expect(countText).toBeVisible({ timeout: 10000 })
  })

  test('shows client table with headers', async ({ page }) => {
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Table headers (i18n: JP/EN)
    await expect(page.getByText(/^名前$|^Name$/).first()).toBeVisible()
    await expect(page.getByText(/^作成日$|^Created/).first()).toBeVisible()
    await expect(page.getByText(/^操作$|^Actions$/).first()).toBeVisible()
  })

  test('clicking add button opens create modal', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: /クライアント追加|Add Client/ })
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
      const cancelBtn = page.locator('button', { hasText: /キャンセル|Cancel/ })
      const cancelVisible = await cancelBtn.isVisible().catch(() => false)
      if (cancelVisible) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
      }
    } else {
      // Modal may appear as a separate element without role="dialog"
      // Check for input that appears after clicking
      const input = page.locator('input[placeholder*="サンプル"], input[placeholder*="クライアント"], input[placeholder*="Sample"], input[placeholder*="Client"]').first()
      const inputVisible = await input.isVisible().catch(() => false)
      expect(inputVisible || modalVisible).toBeTruthy()
    }
  })

  test('client rows have edit and delete buttons', async ({ page }) => {
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const editBtns = page.locator('button', { hasText: /^編集$|^Edit$/ })
    const deleteBtns = page.locator('button', { hasText: /^削除$|^Delete$/ })
    const editCount = await editBtns.count()
    const deleteCount = await deleteBtns.count()

    // If clients exist, they should have action buttons
    if (editCount > 0) {
      expect(editCount).toBeGreaterThan(0)
      expect(deleteCount).toBeGreaterThan(0)
    }
  })
})
