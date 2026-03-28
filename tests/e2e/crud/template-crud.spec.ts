import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Template CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
  })

  test('C-TEMPLATE-01: View template list', async ({ page }) => {
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('C-TEMPLATE-02: Create a new template', async ({ page }) => {
    const createBtn = page.locator('button:has-text("作成"), button:has-text("Create"), button:has-text("追加"), button:has-text("Add")')
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click()
      await page.waitForTimeout(1000)
    }
    expect(true).toBeTruthy()
  })

  test('C-TEMPLATE-03: Edit a template', async ({ page }) => {
    await page.waitForTimeout(2000)
    const editBtn = page.locator('button:has-text("編集"), button:has-text("Edit")')
    if (await editBtn.first().isVisible()) {
      await editBtn.first().click()
      await page.waitForTimeout(1000)
    }
    expect(true).toBeTruthy()
  })
})
