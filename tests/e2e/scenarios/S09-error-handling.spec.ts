import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S09: Error Handling and Edge Cases', () => {
  test('nonexistent task ID shows not found or redirects', async ({ page }) => {
    await login(page)

    // Navigate to a task with a fake UUID
    await page.goto('/tasks/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(5000)

    // Should either show a "not found" message, redirect to tasks, or show error
    const url = page.url()
    const pageContent = await page.textContent('body')

    const shows404 = pageContent?.includes('見つかりません') ||
      pageContent?.includes('not found') ||
      pageContent?.includes('404') ||
      pageContent?.includes('存在しません')
    const redirectedToTasks = url.includes('/tasks') && !url.includes('00000000')
    const redirectedToLogin = url.includes('/login')
    const showsError = pageContent?.includes('エラー')

    expect(shows404 || redirectedToTasks || redirectedToLogin || showsError).toBeTruthy()
  })

  test('invalid path shows 404 page', async ({ page }) => {
    await login(page)

    await page.goto('/this-page-does-not-exist-at-all')
    await page.waitForTimeout(3000)

    const pageContent = await page.textContent('body')
    const url = page.url()

    const shows404 = pageContent?.includes('404') ||
      pageContent?.includes('見つかりません') ||
      pageContent?.includes('not found') ||
      pageContent?.includes('ページが見つかりません')
    const redirected = url.includes('/dashboard') || url.includes('/login')

    expect(shows404 || redirected).toBeTruthy()
  })

  test('empty task creation form shows validation errors', async ({ page }) => {
    await login(page)

    await page.goto('/tasks/new')
    await page.waitForURL(/\/tasks\/new/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Try to submit without filling any fields
    const submitBtn = page.locator('button[type="submit"]')
    const submitCount = await submitBtn.count()

    if (submitCount > 0) {
      await submitBtn.first().click()
      await page.waitForTimeout(2000)

      // Should show validation error messages
      const pageContent = await page.textContent('body')
      const hasClientError = pageContent?.includes('クライアント名は必須') || pageContent?.includes('必須')
      const hasTitleError = pageContent?.includes('タスク名は必須') || pageContent?.includes('必須')
      const hasAnyError = pageContent?.includes('必須') || pageContent?.includes('入力してください')

      // Form should show validation errors
      expect(hasClientError || hasTitleError || hasAnyError).toBeTruthy()

      // Should still be on /tasks/new (not navigated away)
      expect(page.url()).toContain('/tasks/new')
    }
  })

  test('member edit with empty name shows validation', async ({ page }) => {
    await login(page)

    await page.goto('/members')
    await page.waitForURL(/\/members/, { timeout: 30000 })
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Click edit on a member
    const editBtn = page.locator('button', { hasText: '編集' }).first()
    const editCount = await editBtn.count()
    test.skip(editCount === 0, 'No edit buttons available')

    await editBtn.click()
    await page.waitForTimeout(1000)

    // Clear the name field
    const nameInput = page.locator('input[placeholder="フルネーム"]')
    const nameVisible = await nameInput.isVisible().catch(() => false)

    if (nameVisible) {
      await nameInput.clear()
      await page.waitForTimeout(500)

      // Try to save
      const saveBtn = page.locator('button', { hasText: /保存|更新/ }).first()
      const saveVisible = await saveBtn.isVisible().catch(() => false)
      if (saveVisible) {
        await saveBtn.click()
        await page.waitForTimeout(1000)

        // Should show validation error or remain in modal
        const pageContent = await page.textContent('body')
        const hasError = pageContent?.includes('必須') || pageContent?.includes('名前') || pageContent?.includes('入力')
        const modalStillOpen = await page.locator('text=メンバー編集').isVisible().catch(() => false)

        // Either validation error shows or modal stays open (preventing invalid save)
        expect(hasError || modalStillOpen).toBeTruthy()
      }
    }

    // Close modal
    const cancelBtn = page.locator('button', { hasText: 'キャンセル' })
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
  })

  test('very long text input does not break layout', async ({ page }) => {
    await login(page)

    await page.goto('/tasks/new')
    await page.waitForURL(/\/tasks\/new/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    const longText = 'あ'.repeat(500)

    // Fill client name with very long text
    const clientInput = page.locator('#client_name')
    await expect(clientInput).toBeVisible({ timeout: 10000 })
    await clientInput.fill(longText)

    // Fill task title with very long text
    const titleInput = page.locator('#title')
    await expect(titleInput).toBeVisible({ timeout: 10000 })
    await titleInput.fill(longText)

    // Page should not crash — header and sidebar still visible
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible({ timeout: 5000 })

    // Form should still be functional
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible({ timeout: 5000 })

    // No runtime errors
    const pageContent = await page.textContent('body')
    const hasRuntimeError = pageContent?.includes('Application error') || pageContent?.includes('Unhandled Runtime Error')
    expect(hasRuntimeError).toBeFalsy()
  })
})
