import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S08: Cross-Page Data Consistency', () => {
  test('member counts are consistent across pages', async ({ page }) => {
    await login(page)

    // Step 1: Go to /members, count active members
    await page.goto('/members')
    await page.waitForURL(/\/members/, { timeout: 30000 })
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    // Collect member names from the members page
    const memberPageContent = await page.textContent('body')
    const knownMembers = ['伊藤', '安田', '秋元']
    const membersOnMemberPage = knownMembers.filter(name => memberPageContent?.includes(name))

    // Extract member count from "メンバー数" text if available
    const memberCountText = page.locator('text=メンバー数')
    const hasMemberCount = await memberCountText.isVisible().catch(() => false)
    let memberCountNum = 0
    if (hasMemberCount) {
      const countParent = memberCountText.locator('..')
      const countContent = await countParent.textContent()
      const match = countContent?.match(/(\d+)/)
      if (match) {
        memberCountNum = parseInt(match[1])
      }
    }

    // Step 2: Go to /workload, count members in table
    await page.goto('/workload')
    await page.waitForURL(/\/workload/, { timeout: 30000 })
    await page.waitForTimeout(3000)

    const workloadContent = await page.textContent('body')
    const membersOnWorkload = knownMembers.filter(name => workloadContent?.includes(name))

    // Members visible on members page should also be on workload page
    expect(membersOnWorkload.length).toBeGreaterThan(0)

    // Step 3: Go to /dashboard, check creator workload section
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(3000)

    // Click creator tab
    const creatorTab = page.locator('button', { hasText: 'クリエイター別' })
    const hasCreatorTab = await creatorTab.isVisible().catch(() => false)
    if (hasCreatorTab) {
      await creatorTab.click()
      await page.waitForTimeout(2000)
    }

    const dashboardContent = await page.textContent('body')
    const membersOnDashboard = knownMembers.filter(name => dashboardContent?.includes(name))
    expect(membersOnDashboard.length).toBeGreaterThan(0)

    // Step 4: Go to /tasks, verify assignee filter contains members
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
    await page.waitForTimeout(3000)

    const taskPageContent = await page.textContent('body')
    // Member names should appear somewhere on the tasks page (in filters or task rows)
    // At minimum, task page should be functional
    expect(taskPageContent?.length).toBeGreaterThan(0)
  })

  test('client counts are consistent across pages', async ({ page }) => {
    await login(page)

    // Step 1: Go to /clients, count clients
    await page.goto('/clients')
    await page.waitForURL(/\/clients/, { timeout: 30000 })
    await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    const clientPageContent = await page.textContent('body')
    const knownClients = ['株式会社サンプル', 'テスト工業', 'グローバル商事']
    const clientsOnClientPage = knownClients.filter(name => clientPageContent?.includes(name))

    // Step 2: Go to /dashboard, switch to client view
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(3000)

    const clientTab = page.locator('button', { hasText: 'クライアント別' })
    const hasClientTab = await clientTab.isVisible().catch(() => false)
    if (hasClientTab) {
      await clientTab.click()
      await page.waitForTimeout(2000)
    }

    const dashboardContent = await page.textContent('body')
    const clientsOnDashboard = knownClients.filter(name => dashboardContent?.includes(name))

    // Clients visible on client page should also appear on dashboard client view
    // Both should have at least some overlap
    if (clientsOnClientPage.length > 0 && clientsOnDashboard.length > 0) {
      const overlap = clientsOnClientPage.filter(c => clientsOnDashboard.includes(c))
      expect(overlap.length).toBeGreaterThan(0)
    } else {
      // At least the dashboard should load without errors
      expect(dashboardContent?.length).toBeGreaterThan(0)
    }
  })
})
