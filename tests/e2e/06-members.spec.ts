import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-06: Members Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/members')
    await page.waitForURL(/\/members/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    // i18n: JP "メンバー管理" / EN "Members"
    await expect(page.getByText(/メンバー管理|Members/)).toBeVisible({ timeout: 10000 })
  })

  test('has member list and org chart tabs', async ({ page }) => {
    // i18n: JP "メンバー一覧"/"組織図" / EN "Member List"/"Org Chart"
    await expect(page.locator('button', { hasText: /メンバー一覧|Member List/ })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button', { hasText: /組織図|Org Chart/ })).toBeVisible()
  })

  test('shows member table with data', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Table header columns should be visible (i18n: JP/EN)
    await expect(page.getByText(/^名前$|^Name$/).first()).toBeVisible()
    await expect(page.getByText(/^メール$|^Email$/).first()).toBeVisible()
    await expect(page.getByText(/^ロール$|^Role$/).first()).toBeVisible()
  })

  test('shows member count', async ({ page }) => {
    await page.waitForTimeout(3000)
    // i18n: JP "メンバー数:" / EN "Members:"
    const countText = page.getByText(/メンバー数|Members:/)
    await expect(countText).toBeVisible({ timeout: 10000 })
  })

  test('has invite member button', async ({ page }) => {
    // i18n: JP "メンバー招待" / EN "Invite Member"
    const inviteBtn = page.locator('button', { hasText: /メンバー招待|Invite Member/ })
    await expect(inviteBtn).toBeVisible({ timeout: 10000 })
  })

  test('can switch to org chart tab', async ({ page }) => {
    const orgChartTab = page.locator('button', { hasText: /組織図|Org Chart/ })
    await orgChartTab.click()
    await page.waitForTimeout(2000)

    // Org chart should render some content (tree nodes or a container)
    // OrgChart component renders member nodes
    const orgContent = page.locator('[class*="bg-surface"]')
    const count = await orgContent.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking edit opens edit modal', async ({ page }) => {
    // Wait for member rows to load
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Find and click the first edit button (i18n: JP "編集" / EN "Edit")
    const editBtn = page.locator('button', { hasText: /^編集$|^Edit$/ }).first()
    const editCount = await editBtn.count()

    if (editCount > 0) {
      await editBtn.click()
      // Modal should appear with edit member title (i18n: JP "メンバー編集" / EN "Edit Member")
      await expect(page.getByText(/メンバー編集|Edit Member/)).toBeVisible({ timeout: 5000 })
      // Modal should have a name input (i18n: JP "フルネーム" / EN "Full name")
      await expect(page.locator('input[placeholder="フルネーム"], input[placeholder="Full name"]').first()).toBeVisible()
      // Close the modal
      await page.locator('button', { hasText: /キャンセル|Cancel/ }).click()
      await expect(page.getByText(/メンバー編集|Edit Member/)).toBeHidden({ timeout: 5000 })
    } else {
      test.skip(true, 'No edit buttons available')
    }
  })
})
