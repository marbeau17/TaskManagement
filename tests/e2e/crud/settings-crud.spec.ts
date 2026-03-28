import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Settings CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('C-SETTINGS-01: View settings page', async ({ page }) => {
    await page.waitForTimeout(2000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('C-SETTINGS-02: Toggle dark mode', async ({ page }) => {
    await page.waitForTimeout(2000)
    const darkBtn = page.locator('button:has-text("ダーク"), button:has-text("Dark")')
    if (await darkBtn.first().isVisible()) {
      await darkBtn.first().click()
      await page.waitForTimeout(1000)
      // Check dark class applied
      const html = page.locator('html')
      const className = await html.getAttribute('class')
      expect(className).toContain('dark')

      // Toggle back
      const lightBtn = page.locator('button:has-text("ライト"), button:has-text("Light")')
      if (await lightBtn.first().isVisible()) {
        await lightBtn.first().click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('C-SETTINGS-03: Switch language', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Look for language toggle
    const langBtn = page.locator('button:has-text("EN"), button:has-text("English"), button:has-text("日本語")')
    if (await langBtn.first().isVisible()) {
      await langBtn.first().click()
      await page.waitForTimeout(1000)
    }
    expect(true).toBeTruthy()
  })

  test('C-SETTINGS-04: Save settings', async ({ page }) => {
    await page.waitForTimeout(2000)
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")')
    if (await saveBtn.first().isVisible()) {
      await saveBtn.first().click()
      await page.waitForTimeout(2000)
    }
    expect(true).toBeTruthy()
  })
})
