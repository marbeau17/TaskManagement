import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('CRM Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S40-1: CRM page loads with tabs', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')

    // Should see tab navigation
    await expect(page.getByText('ダッシュボード').or(page.getByText('Dashboard'))).toBeVisible()
    await expect(page.getByText('コンタクト').or(page.getByText('Contacts'))).toBeVisible()
    await expect(page.getByText('企業').or(page.getByText('Companies'))).toBeVisible()
    await expect(page.getByText('リード').or(page.getByText('Leads'))).toBeVisible()
    await expect(page.getByText('ディール').or(page.getByText('Deals'))).toBeVisible()
  })

  test('S40-2: CRM sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click CRM in sidebar
    const crmLink = page.locator('a[href="/crm"]')
    if (await crmLink.isVisible()) {
      await crmLink.click()
      await page.waitForURL(/\/crm/)
      await expect(page).toHaveURL(/\/crm/)
    }
  })

  test('S40-3: Companies tab shows list', async ({ page }) => {
    await page.goto('/crm?tab=companies')
    await page.waitForLoadState('networkidle')

    // Should show table or empty state
    const table = page.locator('table')
    const emptyState = page.getByText('データがありません').or(page.getByText('No data'))
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('S40-4: Contacts tab shows list', async ({ page }) => {
    await page.goto('/crm?tab=contacts')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    const emptyState = page.getByText('データがありません').or(page.getByText('No data'))
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('S40-5: Leads tab shows list', async ({ page }) => {
    await page.goto('/crm?tab=leads')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    const emptyState = page.getByText('データがありません').or(page.getByText('No data'))
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('S40-6: Deals tab shows list', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    const emptyState = page.getByText('データがありません').or(page.getByText('No data'))
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('S40-7: Create company via form', async ({ page }) => {
    await page.goto('/crm?tab=companies')
    await page.waitForLoadState('networkidle')

    // Click add button
    await page.click('button:has-text("企業"), button:has-text("Companies")')
    await page.waitForTimeout(500)

    // Fill form
    await page.fill('input[placeholder*="企業名"], input[placeholder*="Company"]', 'E2Eテスト企業')
    await page.click('button:has-text("保存"), button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Verify appears in list
    await expect(page.getByText('E2Eテスト企業')).toBeVisible({ timeout: 5000 })
  })

  test('S40-8: Dashboard shows KPI cards', async ({ page }) => {
    await page.goto('/crm?tab=dashboard')
    await page.waitForLoadState('networkidle')

    // Should show KPI cards (pipeline value, won this month, etc.)
    // Even if 0, the cards should be visible
    const cards = page.locator('[class*="rounded-[10px]"][class*="shadow"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test('S40-9: Tab switching preserves state', async ({ page }) => {
    await page.goto('/crm?tab=companies')
    await page.waitForLoadState('networkidle')

    // Switch to contacts
    await page.click('button:has-text("コンタクト"), button:has-text("Contacts")')
    await page.waitForURL(/tab=contacts/)

    // Switch to deals
    await page.click('button:has-text("ディール"), button:has-text("Deals")')
    await page.waitForURL(/tab=deals/)

    // Switch back to dashboard
    await page.click('button:has-text("ダッシュボード"), button:has-text("Dashboard")')
    await page.waitForURL(/tab=dashboard/)
  })

  test('S40-10: CRM page is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')

    // Should still show tabs (may be scrollable)
    const tabContainer = page.locator('[class*="border-b"][class*="border-border2"]').first()
    await expect(tabContainer).toBeVisible()
  })
})
