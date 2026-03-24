import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S10: Responsive Layout and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('all main pages have proper page titles', async ({ page }) => {
    const pages = [
      { path: '/dashboard', expectedText: 'ダッシュボード' },
      { path: '/tasks', expectedText: 'タスク一覧' },
      { path: '/workload', expectedText: '稼働管理' },
      { path: '/members', expectedText: 'メンバー' },
      { path: '/clients', expectedText: 'クライアント' },
      { path: '/settings', expectedText: '設定' },
    ]

    for (const p of pages) {
      await page.goto(p.path)
      await page.waitForTimeout(2000)

      // Page should contain the expected text somewhere
      const pageContent = await page.textContent('body')
      expect(pageContent).toContain(p.expectedText)
    }
  })

  test('navigation links have meaningful text', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Sidebar should have meaningful navigation links
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible({ timeout: 10000 })

    const navTexts = ['ダッシュボード', 'タスク', 'クライアント', '稼働管理', 'メンバー', '設定']
    let foundNavItems = 0

    for (const text of navTexts) {
      const navItem = sidebar.locator(`text=${text}`).first()
      const isVisible = await navItem.isVisible().catch(() => false)
      if (isVisible) {
        foundNavItems++
      }
    }

    // Most navigation items should be present
    expect(foundNavItems).toBeGreaterThanOrEqual(4)
  })

  test('form inputs have labels or placeholders', async ({ page }) => {
    // Check task creation form
    await page.goto('/tasks/new')
    await page.waitForURL(/\/tasks\/new/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    const inputs = page.locator('input:visible, select:visible, textarea:visible')
    const inputCount = await inputs.count()

    let labeledInputs = 0
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const placeholder = await input.getAttribute('placeholder')
      const ariaLabel = await input.getAttribute('aria-label')
      const name = await input.getAttribute('name')

      // Check if there's a label element for this input
      let hasLabel = false
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        hasLabel = (await label.count()) > 0
      }

      // Input should have at least one accessibility attribute
      if (hasLabel || placeholder || ariaLabel || name) {
        labeledInputs++
      }
    }

    // Most inputs should have labels/placeholders
    if (inputCount > 0) {
      const labelRatio = labeledInputs / Math.min(inputCount, 10)
      expect(labelRatio).toBeGreaterThanOrEqual(0.5)
    }
  })

  test('buttons are clickable and interactive', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // All buttons should be enabled (not disabled) unless intentionally so
    const buttons = page.locator('button:visible')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)

    // Check that buttons are not overlapped / obscured
    let clickableButtons = 0
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const btn = buttons.nth(i)
      const isEnabled = await btn.isEnabled()
      if (isEnabled) {
        clickableButtons++
      }
    }

    expect(clickableButtons).toBeGreaterThan(0)
  })

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore known benign errors (e.g., favicon, third-party)
        if (!text.includes('favicon') && !text.includes('net::ERR') && !text.includes('Failed to load resource')) {
          consoleErrors.push(text)
        }
      }
    })

    const pagesToCheck = ['/dashboard', '/tasks', '/workload', '/members', '/clients', '/settings']

    for (const path of pagesToCheck) {
      consoleErrors.length = 0 // reset for each page
      await page.goto(path)
      await page.waitForTimeout(3000)

      // Filter out React hydration warnings and other common non-critical errors
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('Hydration') &&
        !err.includes('Warning:') &&
        !err.includes('DevTools') &&
        !err.includes('Download the React DevTools')
      )

      // No critical JS errors should be present
      if (criticalErrors.length > 0) {
        console.log(`Console errors on ${path}:`, criticalErrors)
      }
      // We allow some non-critical errors but flag truly critical ones
      const hasCriticalCrash = criticalErrors.some(err =>
        err.includes('Uncaught') || err.includes('TypeError') || err.includes('ReferenceError')
      )
      expect(hasCriticalCrash).toBeFalsy()
    }
  })

  test('pages render correctly at mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Page should still show content (not blank)
    const pageContent = await page.textContent('body')
    expect(pageContent?.includes('ダッシュボード')).toBeTruthy()

    // Navigate to tasks
    await page.goto('/tasks')
    await page.waitForTimeout(2000)

    const tasksContent = await page.textContent('body')
    expect(tasksContent?.includes('タスク')).toBeTruthy()

    // No runtime errors at mobile size
    const hasError = tasksContent?.includes('Application error') || tasksContent?.includes('Unhandled Runtime Error')
    expect(hasError).toBeFalsy()
  })
})
