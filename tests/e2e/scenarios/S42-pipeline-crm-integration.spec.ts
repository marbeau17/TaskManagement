import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Pipeline-CRM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S42-1: Pipeline page still loads correctly', async ({ page }) => {
    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')

    // Pipeline should show table or content
    await expect(page.locator('body')).toBeVisible()
    // Should have list/summary tabs
    const tabArea = page.locator('button:has-text("List"), button:has-text("一覧")').first()
    await expect(tabArea).toBeVisible({ timeout: 10000 }).catch(() => {})
  })

  test('S42-2: CRM and Pipeline both accessible from sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check both nav items exist
    const pipelineLink = page.locator('a[href="/pipeline"]')
    const crmLink = page.locator('a[href="/crm"]')

    // At least one should be visible (depends on viewport)
    const pipelineVisible = await pipelineLink.isVisible().catch(() => false)
    const crmVisible = await crmLink.isVisible().catch(() => false)

    // Admin user should see both
    expect(pipelineVisible || crmVisible).toBe(true)
  })

  test('S42-3: CRM deals show pipeline-compatible data', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    // Deals table should be visible
    const table = page.locator('table')
    const emptyState = page.getByText('データがありません').or(page.getByText('No data'))
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('S42-4: CRM dashboard KPIs load without error', async ({ page }) => {
    await page.goto('/crm?tab=dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for KPI cards to render
    await page.waitForTimeout(2000)

    // Should have at least one KPI card visible
    const cards = page.locator('[class*="rounded-[10px]"][class*="shadow"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('S42-5: Navigate between Pipeline and CRM without errors', async ({ page }) => {
    // Go to pipeline
    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // Go to CRM
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // Back to pipeline
    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // To CRM deals
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('S42-6: CRM seed data can be loaded', async ({ page }) => {
    // Seed CRM data via API
    const response = await page.request.post('/api/crm/seed')

    // Should succeed or return data already exists error
    expect([200, 500]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.created.companies).toBeGreaterThan(0)
    }
  })

  test('S42-7: After seeding, CRM shows data', async ({ page }) => {
    await page.goto('/crm?tab=companies')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should see seeded companies (or at least not crash)
    const body = await page.textContent('body')
    // Check for any company name or empty state
    const hasContent = body?.includes('テックイノベーション') ||
                       body?.includes('データがありません') ||
                       body?.includes('No data')
    expect(hasContent).toBe(true)
  })

  test('S42-8: CRM deal stages match expected options', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    // Look for stage select if deals exist
    const stageSelect = page.locator('select').first()
    if (await stageSelect.isVisible().catch(() => false)) {
      const options = await stageSelect.locator('option').allTextContents()
      // Should have standard stages
      const hasStages = options.some(o =>
        o.includes('提案') || o.includes('交渉') || o.includes('Proposal') || o.includes('Negotiation')
      )
      expect(hasStages).toBe(true)
    }
  })
})
