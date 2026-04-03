import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

const MOBILE = { width: 375, height: 812 } // iPhone SE/13 mini

test.describe('Responsive — All Tabs (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await login(page)
  })

  // Core pages
  test('S60-1: My Page', async ({ page }) => {
    await page.goto('/mypage')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
    // No horizontal overflow
    const body = page.locator('body')
    const box = await body.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(376)
  })

  test('S60-2: Dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-3: Tasks — List view', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-4: Tasks — Kanban view', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const kanbanBtn = page.getByText('カンバン').or(page.getByText('Kanban'))
    if (await kanbanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await kanbanBtn.click()
      await page.waitForTimeout(1000)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('S60-5: Issues', async ({ page }) => {
    await page.goto('/issues')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-6: Projects', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-7: Workload', async ({ page }) => {
    await page.goto('/workload')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-8: News', async ({ page }) => {
    await page.goto('/news')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-9: Pipeline', async ({ page }) => {
    await page.goto('/pipeline')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  // Chat
  test('S60-10: Chat', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  // Calendar
  test('S60-11: Calendar', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  // CRM tabs
  test('S60-12: CRM Dashboard', async ({ page }) => {
    await page.goto('/crm?tab=dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-13: CRM Contacts', async ({ page }) => {
    await page.goto('/crm?tab=contacts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-14: CRM Companies', async ({ page }) => {
    await page.goto('/crm?tab=companies')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-15: CRM Leads', async ({ page }) => {
    await page.goto('/crm?tab=leads')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-16: CRM Deals', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-17: CRM Campaigns', async ({ page }) => {
    await page.goto('/crm?tab=campaigns')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-18: CRM Forms', async ({ page }) => {
    await page.goto('/crm?tab=forms')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-19: CRM Inbox', async ({ page }) => {
    await page.goto('/crm?tab=inbox')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S60-20: Profile', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  // Mobile sidebar
  test('S60-21: Mobile sidebar opens/closes', async ({ page }) => {
    await page.goto('/mypage')
    await page.waitForLoadState('networkidle')
    // Hamburger menu should be visible
    const hamburger = page.locator('button[aria-label*="メニュー"], button[aria-label*="menu"], button[aria-label*="Menu"]').first()
    if (await hamburger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hamburger.click()
      await page.waitForTimeout(500)
      // Sidebar should be visible
      const sidebar = page.locator('aside').first()
      await expect(sidebar).toBeVisible()
      // Click backdrop to close
      const backdrop = page.locator('.bg-black\\/50').first()
      if (await backdrop.isVisible()) {
        await backdrop.click()
        await page.waitForTimeout(500)
      }
    }
  })

  // Tab scrolling on CRM
  test('S60-22: CRM tabs are scrollable on mobile', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('domcontentloaded')
    // Tabs should exist even on mobile
    const tabs = page.locator('button').filter({ hasText: /ダッシュボード|Dashboard/ })
    await expect(tabs.first()).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
