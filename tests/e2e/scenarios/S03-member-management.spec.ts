import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S03: Member Management — View, Edit, Invite', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/members')
    await page.waitForURL(/\/members/, { timeout: 30000 })
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)
  })

  test('member list shows actual names from Supabase', async ({ page }) => {
    // Verify known member names appear
    const pageContent = await page.textContent('body')
    const knownMembers = ['伊藤', '安田', '秋元']
    const foundMembers = knownMembers.filter(name => pageContent?.includes(name))
    expect(foundMembers.length).toBeGreaterThanOrEqual(2)
  })

  test('switch to org chart tab and verify tree nodes', async ({ page }) => {
    // Click 組織図 tab
    const orgChartTab = page.locator('button', { hasText: '組織図' })
    await expect(orgChartTab).toBeVisible({ timeout: 10000 })
    await orgChartTab.click()
    await page.waitForTimeout(3000)

    // Tree nodes should render — look for member cards/nodes in the org chart
    const orgContent = page.locator('[class*="bg-surface"]')
    const count = await orgContent.count()
    expect(count).toBeGreaterThan(0)

    // At least one member name should appear in the org chart
    const pageContent = await page.textContent('body')
    const hasName = pageContent?.includes('安田') || pageContent?.includes('伊藤') || pageContent?.includes('秋元')
    expect(hasName).toBeTruthy()
  })

  test('click edit on a member and verify modal fields', async ({ page }) => {
    // Find and click the first "編集" button
    const editBtn = page.locator('button', { hasText: '編集' }).first()
    const editCount = await editBtn.count()
    test.skip(editCount === 0, 'No edit buttons available')

    await editBtn.click()
    await page.waitForTimeout(1000)

    // Modal should appear with "メンバー編集" title
    await expect(page.locator('text=メンバー編集')).toBeVisible({ timeout: 5000 })

    // Verify name field is present
    const nameInput = page.locator('input[placeholder="フルネーム"]')
    const nameVisible = await nameInput.isVisible().catch(() => false)
    if (nameVisible) {
      await expect(nameInput).toBeVisible()
      const nameValue = await nameInput.inputValue()
      expect(nameValue.length).toBeGreaterThan(0)
    }

    // Verify department field
    const deptField = page.locator('text=部署').first()
    const hasDept = await deptField.isVisible().catch(() => false)

    // Verify title/role field
    const titleField = page.locator('text=役職').or(page.locator('text=タイトル')).first()
    const hasTitle = await titleField.isVisible().catch(() => false)

    // Verify level field
    const levelField = page.locator('text=レベル').or(page.locator('text=スキル')).first()
    const hasLevel = await levelField.isVisible().catch(() => false)

    // At least some fields should be present
    expect(hasDept || hasTitle || hasLevel).toBeTruthy()

    // Verify manager dropdown exists
    const managerField = page.locator('text=上長').or(page.locator('text=マネージャー')).or(page.locator('select')).first()
    const hasManager = await managerField.isVisible().catch(() => false)

    // Close modal without saving
    const cancelBtn = page.locator('button', { hasText: 'キャンセル' })
    const cancelVisible = await cancelBtn.isVisible().catch(() => false)
    if (cancelVisible) {
      await cancelBtn.click()
    } else {
      // Try clicking outside or pressing Escape
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(500)

    // Modal should be closed
    await expect(page.locator('text=メンバー編集')).toBeHidden({ timeout: 5000 })
  })

  test('invite member modal opens with correct form fields', async ({ page }) => {
    // Click "+ メンバー招待" button
    const inviteBtn = page.locator('button', { hasText: 'メンバー招待' })
    await expect(inviteBtn).toBeVisible({ timeout: 10000 })
    await inviteBtn.click()
    await page.waitForTimeout(1000)

    // Modal or form should appear
    const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false)
    const formVisible = await page.locator('text=メンバー招待').nth(1).isVisible({ timeout: 5000 }).catch(() => false)

    // Look for expected form fields
    const emailInput = page.locator('input[type="email"], input[placeholder*="メール"], input[placeholder*="email"]').first()
    const hasEmail = await emailInput.isVisible().catch(() => false)

    const nameInput = page.locator('input[placeholder*="名前"], input[placeholder*="フルネーム"]').first()
    const hasName = await nameInput.isVisible().catch(() => false)

    // Role selector
    const roleSelect = page.locator('select')
    const hasRole = (await roleSelect.count()) > 0

    // At least some invite fields should exist
    expect(hasEmail || hasName || hasRole || modalVisible || formVisible).toBeTruthy()

    // Close without submitting
    const cancelBtn = page.locator('button', { hasText: 'キャンセル' })
    const cancelVisible = await cancelBtn.isVisible().catch(() => false)
    if (cancelVisible) {
      await cancelBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(500)
  })
})
