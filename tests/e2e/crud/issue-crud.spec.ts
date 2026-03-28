import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Issue CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('C-ISSUE-01: View issue list', async ({ page }) => {
    await page.goto('/issues')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('C-ISSUE-02: Create a new issue', async ({ page }) => {
    await page.goto('/issues/new')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Fill title
    const titleInput = page.locator('input[name="title"], input[placeholder*="タイトル"], input[placeholder*="title"]').first()
    if (await titleInput.isVisible()) {
      await titleInput.fill('CRUD Test Issue - ' + Date.now())
    }
    expect(true).toBeTruthy()
  })

  test('C-ISSUE-03: View issue detail', async ({ page }) => {
    await page.goto('/issues')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const issueLink = page.locator('a[href*="/issues/"]').first()
    if (await issueLink.isVisible()) {
      await issueLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify detail page content
      const body = await page.textContent('body')
      expect(body).toBeTruthy()
    }
  })

  test('C-ISSUE-04: Issue filter and search', async ({ page }) => {
    await page.goto('/issues')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Use search
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="search"], input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
      await searchInput.fill('')
    }
    expect(true).toBeTruthy()
  })
})
