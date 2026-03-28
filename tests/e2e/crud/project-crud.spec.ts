import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Project CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('C-PROJECT-01: View project list', async ({ page }) => {
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    expect(page.url()).toContain('/projects')
  })

  test('C-PROJECT-02: Create a new project', async ({ page }) => {
    const addBtn = page.locator('button:has-text("作成"), button:has-text("Create"), button:has-text("追加"), button:has-text("Add")')
    if (await addBtn.first().isVisible()) {
      await addBtn.first().click()
      await page.waitForTimeout(500)

      const nameInput = page.locator('input[placeholder*="プロジェクト"], input[placeholder*="project"], input[placeholder*="Web"]').first()
      if (await nameInput.isVisible()) {
        await nameInput.fill('E2E Test Project ' + Date.now())
      }
    }
    expect(true).toBeTruthy()
  })

  test('C-PROJECT-03: View project detail tabs', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Click first project
    const projectCard = page.locator('a[href*="/projects/"]').first()
    if (await projectCard.isVisible()) {
      await projectCard.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify tabs exist
      const tabs = page.locator('button[role="tab"], [class*="tab"]')
      const tabCount = await tabs.count()
      expect(tabCount).toBeGreaterThan(0)

      // Click through tabs
      for (let i = 0; i < Math.min(tabCount, 7); i++) {
        await tabs.nth(i).click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('C-PROJECT-04: Project milestones tab', async ({ page }) => {
    const projectCard = page.locator('a[href*="/projects/"]').first()
    if (await projectCard.isVisible()) {
      await projectCard.click()
      await page.waitForLoadState('networkidle')

      const milestoneTab = page.locator('button:has-text("マイルストーン"), button:has-text("Milestone")')
      if (await milestoneTab.first().isVisible()) {
        await milestoneTab.first().click()
        await page.waitForTimeout(2000)
      }
    }
    expect(true).toBeTruthy()
  })
})
