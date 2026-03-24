import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-06: Members Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/members')
    await page.waitForURL(/\/members/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    await expect(page.locator('text=メンバー管理')).toBeVisible({ timeout: 10000 })
  })

  test('has member list and org chart tabs', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'メンバー一覧' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button', { hasText: '組織図' })).toBeVisible()
  })

  test('shows member table with data', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Table header columns should be visible
    await expect(page.locator('text=名前').first()).toBeVisible()
    await expect(page.locator('text=メール').first()).toBeVisible()
    await expect(page.locator('text=ロール').first()).toBeVisible()
  })

  test('shows member count', async ({ page }) => {
    await page.waitForTimeout(3000)
    const countText = page.locator('text=メンバー数')
    await expect(countText).toBeVisible({ timeout: 10000 })
  })

  test('has invite member button', async ({ page }) => {
    const inviteBtn = page.locator('button', { hasText: 'メンバー招待' })
    await expect(inviteBtn).toBeVisible({ timeout: 10000 })
  })

  test('can switch to org chart tab', async ({ page }) => {
    const orgChartTab = page.locator('button', { hasText: '組織図' })
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
    await page.waitForTimeout(2000)

    // Find and click the first "編集" button
    const editBtn = page.locator('button', { hasText: '編集' }).first()
    const editCount = await editBtn.count()

    if (editCount > 0) {
      await editBtn.click()
      // Modal should appear with "メンバー編集" title
      await expect(page.locator('text=メンバー編集')).toBeVisible({ timeout: 5000 })
      // Modal should have a name input
      await expect(page.locator('input[placeholder="フルネーム"]')).toBeVisible()
      // Close the modal
      await page.locator('button', { hasText: 'キャンセル' }).click()
      await expect(page.locator('text=メンバー編集')).toBeHidden({ timeout: 5000 })
    } else {
      test.skip(true, 'No edit buttons available')
    }
  })
})
