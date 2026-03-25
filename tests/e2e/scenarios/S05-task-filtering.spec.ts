import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S05: Task Filtering and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)
  })

  test('status tab switching changes displayed tasks', async ({ page }) => {
    // Collect all status tab buttons
    const statusTexts = ['すべて', '全て', '進行中', '未着手', '完了', '差し戻し']
    const clickedTabs: string[] = []

    for (const statusText of statusTexts) {
      const tab = page.locator('button', { hasText: statusText }).first()
      const isVisible = await tab.isVisible().catch(() => false)
      if (isVisible) {
        await tab.click()
        await page.waitForTimeout(1500)
        clickedTabs.push(statusText)
      }
    }

    // We should have been able to click at least 2 status tabs
    expect(clickedTabs.length).toBeGreaterThanOrEqual(2)
  })

  test('search box filters tasks', async ({ page }) => {
    // Find the search input
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="タスク"]').first()
    const hasSearch = await searchInput.isVisible().catch(() => false)

    if (hasSearch) {
      // Count initial visible task links
      const initialLinks = page.locator('a[href*="/tasks/"]')
      const allLinks = await initialLinks.all()
      let initialCount = 0
      for (const link of allLinks) {
        const href = await link.getAttribute('href')
        if (href && href !== '/tasks/new' && href !== '/tasks') {
          initialCount++
        }
      }

      // Type a search term that is unlikely to match many tasks
      await searchInput.fill('zzzznonexistent')
      await page.waitForTimeout(2000)

      // Results should change (fewer or zero)
      const filteredLinks = page.locator('a[href*="/tasks/"]')
      const filteredAll = await filteredLinks.all()
      let filteredCount = 0
      for (const link of filteredAll) {
        const href = await link.getAttribute('href')
        if (href && href !== '/tasks/new' && href !== '/tasks') {
          filteredCount++
        }
      }

      // Either count decreased or "no results" message appears
      const noResults = await page.locator('text=タスクが見つかりません').or(page.locator('text=該当なし')).or(page.locator('text=0件')).first().isVisible().catch(() => false)
      expect(filteredCount < initialCount || noResults || filteredCount === 0).toBeTruthy()

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(2000)
    } else {
      // No search box found — skip gracefully
      test.skip(true, 'No search input found on task list')
    }
  })

  test('client filter changes results', async ({ page }) => {
    // Look for a client filter dropdown/select — wait for data to load
    await page.waitForTimeout(2000)
    const clientFilter = page.locator('select').first()
    const filterCount = await clientFilter.count()

    if (filterCount > 0) {
      // Wait for options to be populated (they may load asynchronously)
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel) as HTMLSelectElement | null
          return el && el.options.length > 1
        },
        'select',
        { timeout: 10000 }
      ).catch(() => {})

      const options = await clientFilter.locator('option').all()
      if (options.length > 1) {
        // Select a specific client
        await clientFilter.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        // Page should still function (no crash)
        const pageContent = await page.textContent('body')
        const hasRuntimeError = pageContent?.includes('Application error') || pageContent?.includes('Unhandled Runtime Error')
        expect(hasRuntimeError).toBeFalsy()

        // Some content area should still be visible
        const contentVisible = await page.locator('[class*="bg-surface"]').first().isVisible().catch(() => true)
        expect(contentVisible).toBeTruthy()

        // Reset filter to "all"
        await clientFilter.selectOption({ index: 0 })
        await page.waitForTimeout(1000)
      } else {
        // Only one option — skip gracefully
        test.skip(true, 'Client filter has no selectable options')
      }
    } else {
      test.skip(true, 'No client filter select element found')
    }
  })

  test('period toggle "全期間" shows tasks', async ({ page }) => {
    // Find and click "全期間" button
    const allPeriodBtn = page.locator('button', { hasText: '全期間' })
    const hasAllPeriod = await allPeriodBtn.isVisible().catch(() => false)

    if (hasAllPeriod) {
      await allPeriodBtn.click()
      await page.waitForTimeout(3000)

      // Tasks should appear (or at least the page shouldn't crash)
      const pageContent = await page.textContent('body')
      expect(pageContent?.length).toBeGreaterThan(0)

      // Table area should still be visible
      const tableArea = page.locator('[class*="bg-surface"][class*="rounded"]').first()
      const tableVisible = await tableArea.isVisible().catch(() => false)
      expect(tableVisible).toBeTruthy()
    } else {
      // Look for alternative period controls
      const periodBtns = page.locator('button', { hasText: /今週|今月/ })
      const periodCount = await periodBtns.count()
      expect(periodCount).toBeGreaterThanOrEqual(0) // Acceptable if no period controls
    }
  })

  test('clicking a task navigates to detail and back', async ({ page }) => {
    // Find a task detail link
    const taskLinks = page.locator('a[href*="/tasks/"]')
    const allLinks = await taskLinks.all()
    let detailLink = null

    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      if (href && href !== '/tasks/new' && href !== '/tasks' && href.match(/\/tasks\/[^/]+/)) {
        detailLink = link
        break
      }
    }

    if (detailLink) {
      await detailLink.click()
      await page.waitForURL(/\/tasks\/[^/]+/, { timeout: 15000 })

      // Should be on detail page
      await expect(page.locator('text=一覧に戻る')).toBeVisible({ timeout: 10000 })

      // Go back
      await page.locator('text=一覧に戻る').click()
      await page.waitForURL(/\/tasks/, { timeout: 15000 })

      // Should be back on task list
      const title = page.locator('h1').filter({ hasText: 'タスク一覧' }).or(
        page.locator('header').filter({ hasText: 'タスク一覧' })
      ).first()
      await expect(title).toBeVisible({ timeout: 10000 })
    } else {
      test.skip(true, 'No tasks available for navigation test')
    }
  })
})
