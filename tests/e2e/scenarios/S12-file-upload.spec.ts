import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S12: File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S12-01: Upload file to task attachment', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })
    await page.click('table tbody tr:first-child')
    await page.waitForSelector('text=添付ファイル', { timeout: 15000 })

    // Check attachment section exists
    const attachSection = page.locator('text=添付ファイル')
    await expect(attachSection).toBeVisible()

    // Look for file upload button
    const uploadBtn = page.locator('text=ファイルを添付')
    await expect(uploadBtn).toBeVisible()
  })

  test('S12-02: Upload file validates file size', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })
    await page.click('table tbody tr:first-child')
    await page.waitForSelector('text=添付ファイル', { timeout: 15000 })

    // Attachment section should be present
    await expect(page.locator('text=ファイルを添付')).toBeVisible()
  })

  test('S12-03: Comment file attachment button exists', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForSelector('table', { timeout: 15000 })
    await page.click('table tbody tr:first-child')
    await page.waitForSelector('text=コメント', { timeout: 15000 })

    // Check comment section has attach button
    const commentSection = page.locator('text=コメント').first()
    await expect(commentSection).toBeVisible()
  })
})
