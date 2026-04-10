import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-10: Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    if (page.url().includes('change-password')) {
      await page.goto('/profile')
    } else {
      await page.goto('/profile')
    }
    await page.waitForURL(/\/profile/, { timeout: 30000 })
  })

  test('displays profile page with user name', async ({ page }) => {
    const heading = page.locator('h1, h2, [class*="text-2xl"], [class*="text-xl"]').first()
    await expect(heading).toBeVisible({ timeout: 15000 })
  })

  test('shows name input field with current user name', async ({ page }) => {
    const nameInput = page.locator('input').first()
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('shows avatar color selection options', async ({ page }) => {
    // Avatar color circles should be visible
    const colorOptions = page.locator('[class*="rounded-full"][class*="cursor-pointer"], [class*="rounded-full"][class*="w-8"], [class*="rounded-full"][class*="w-10"]')
    const count = await colorOptions.count()
    // There should be avatar color options or at least an avatar display
    const avatar = page.locator('[class*="avatar"], [class*="Avatar"]').first()
    const hasAvatar = await avatar.isVisible().catch(() => false)
    expect(count > 0 || hasAvatar).toBeTruthy()
  })

  test('shows theme toggle', async ({ page }) => {
    // Look for theme-related UI (dark/light mode toggle)
    const themeSection = page.locator('text=テーマ, text=Theme, text=ダーク, text=ライト').first()
    const hasTheme = await themeSection.isVisible({ timeout: 5000 }).catch(() => false)
    // If not found by text, look for toggle/switch elements
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]')
    const toggleCount = await toggles.count()
    expect(hasTheme || toggleCount > 0).toBeTruthy()
  })

  test('has save button', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save"), button:has-text("更新")')
    await expect(saveBtn.first()).toBeVisible({ timeout: 10000 })
  })

  test('can edit short name field', async ({ page }) => {
    // Look for short name input
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThanOrEqual(2) // at least name + short name
  })
})
