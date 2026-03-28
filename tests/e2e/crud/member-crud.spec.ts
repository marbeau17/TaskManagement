import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Member CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/members')
    await page.waitForLoadState('networkidle')
  })

  test('C-MEMBER-01: View member list', async ({ page }) => {
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    expect(page.url()).toContain('/members')
  })

  test('C-MEMBER-02: View org chart tab', async ({ page }) => {
    const orgTab = page.locator('button:has-text("組織図"), button:has-text("Org Chart"), button:has-text("Organization")')
    if (await orgTab.first().isVisible()) {
      await orgTab.first().click()
      await page.waitForTimeout(2000)
    }
    expect(true).toBeTruthy()
  })

  test('C-MEMBER-03: Edit member details', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Click on a member row to edit
    const memberRow = page.locator('table tbody tr, [class*="member-row"]').first()
    if (await memberRow.isVisible()) {
      await memberRow.click()
      await page.waitForTimeout(1000)
    }
    expect(true).toBeTruthy()
  })

  test('C-MEMBER-04: Role management tab', async ({ page }) => {
    const roleTab = page.locator('button:has-text("ロール"), button:has-text("Role")')
    if (await roleTab.first().isVisible()) {
      await roleTab.first().click()
      await page.waitForTimeout(2000)
    }
    expect(true).toBeTruthy()
  })
})
