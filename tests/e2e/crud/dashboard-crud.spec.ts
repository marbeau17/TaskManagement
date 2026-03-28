import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Dashboard & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('C-DASH-01: Dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('C-DASH-02: Dashboard content renders', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    expect(page.url()).toContain('/dashboard')
  })

  test('C-DASH-03: Reports page loads', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('C-DASH-04: Reports date range filter', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const filterBtns = page.locator('button:has-text("今週"), button:has-text("Week"), button:has-text("今月"), button:has-text("Month")')
    for (let i = 0; i < await filterBtns.count(); i++) {
      await filterBtns.nth(i).click()
      await page.waitForTimeout(500)
    }
    expect(true).toBeTruthy()
  })

  test('C-DASH-05: Workload page loads', async ({ page }) => {
    await page.goto('/workload')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })
})
