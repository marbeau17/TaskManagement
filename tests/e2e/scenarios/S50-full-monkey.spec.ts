import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Full Application Monkey Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S50-1: All pages load without crash', async ({ page }) => {
    const pages = [
      '/dashboard', '/mypage', '/tasks', '/issues', '/projects',
      '/workload', '/news', '/pipeline', '/crm', '/profile',
      '/reports', '/members', '/settings', '/templates',
    ]
    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('S50-2: CRM all tabs load', async ({ page }) => {
    const tabs = ['dashboard', 'contacts', 'companies', 'leads', 'deals', 'forms', 'campaigns', 'import']
    for (const tab of tabs) {
      await page.goto(`/crm?tab=${tab}`)
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('S50-3: Rapid CRM tab switching', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')
    const tabs = ['contacts', 'companies', 'leads', 'deals', 'forms', 'campaigns', 'dashboard']
    for (let i = 0; i < 15; i++) {
      const tab = tabs[i % tabs.length]
      await page.goto(`/crm?tab=${tab}`)
      await page.waitForTimeout(300)
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-4: Deal kanban view toggle', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    // Try to find kanban button
    const kanbanBtn = page.getByText('カンバン').or(page.getByText('Kanban'))
    if (await kanbanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await kanbanBtn.click()
      await page.waitForTimeout(1000)
      // Switch back
      const listBtn = page.getByText('リスト').or(page.getByText('List'))
      if (await listBtn.isVisible()) await listBtn.click()
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-5: CRM search with various inputs', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="CRM"], input[placeholder*="検索"]').first()
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const inputs = ['テスト', 'test', '<script>', '', 'a'.repeat(100), '田中', '12345']
      for (const input of inputs) {
        await searchInput.fill(input)
        await page.waitForTimeout(400)
      }
      await searchInput.fill('')
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-6: Dashboard period toggle stress', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    for (let i = 0; i < 10; i++) {
      const buttons = page.locator('button').filter({ hasText: /今週|今月|全期間|Week|Month|All/ })
      const count = await buttons.count()
      if (count > 0) {
        await buttons.nth(i % count).click()
        await page.waitForTimeout(200)
      }
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-7: Color theme switching', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for color theme buttons
    const themeButtons = page.locator('button').filter({ has: page.locator('[style*="background-color"]') })
    const count = await themeButtons.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      await themeButtons.nth(i).click()
      await page.waitForTimeout(500)
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-8: Workload page navigation', async ({ page }) => {
    await page.goto('/workload')
    await page.waitForLoadState('networkidle')

    // Click period buttons
    const periodBtns = page.locator('button').filter({ hasText: /今週|今月|全期間/ })
    const cnt = await periodBtns.count()
    for (let i = 0; i < Math.min(cnt, 3); i++) {
      await periodBtns.nth(i).click()
      await page.waitForTimeout(500)
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-9: Browser back/forward across features', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(500)
    await page.goto('/crm?tab=contacts')
    await page.waitForTimeout(500)
    await page.goto('/tasks')
    await page.waitForTimeout(500)
    await page.goto('/crm?tab=deals')
    await page.waitForTimeout(500)
    await page.goto('/mypage')
    await page.waitForTimeout(500)

    for (let i = 0; i < 4; i++) {
      await page.goBack()
      await page.waitForTimeout(300)
    }
    for (let i = 0; i < 4; i++) {
      await page.goForward()
      await page.waitForTimeout(300)
    }
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-10: Mobile viewport all pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const pages = ['/dashboard', '/crm', '/mypage', '/tasks', '/workload']
    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('S50-11: Existing features not broken', async ({ page }) => {
    // Dashboard KPI cards
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const kpiCards = page.locator('[class*="rounded-[10px]"][class*="shadow"]')
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 })

    // Task list
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // My Page
    await page.goto('/mypage')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S50-12: News page with category tabs', async ({ page }) => {
    await page.goto('/news')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
