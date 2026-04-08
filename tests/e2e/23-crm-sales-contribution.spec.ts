import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-23: CRM Sales Contribution (貢献度)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Lead tab shows 貢献度 column header', async ({ page }) => {
    await page.goto('/crm?tab=leads')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 15000 })

    const header = table.locator('th', { hasText: '貢献度' })
    await expect(header).toBeVisible({ timeout: 10000 })
  })

  test('Lead tab 貢献度 cell is clickable and shows input for editing', async ({ page }) => {
    await page.goto('/crm?tab=leads')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 15000 })

    // Find the 貢献度 column index from headers
    const headers = table.locator('thead th')
    const headerCount = await headers.count()
    let colIndex = -1
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent()
      if (text?.includes('貢献度')) {
        colIndex = i
        break
      }
    }
    expect(colIndex).toBeGreaterThanOrEqual(0)

    // Click the first data cell in the 貢献度 column
    const firstRow = table.locator('tbody tr').first()
    const cell = firstRow.locator('td').nth(colIndex)
    await expect(cell).toBeVisible({ timeout: 10000 })
    await cell.click()

    // After clicking, an input or editable element should appear
    const input = cell.locator('input')
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('Deal tab shows 貢献度 column header', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 15000 })

    const header = table.locator('th', { hasText: '貢献度' })
    await expect(header).toBeVisible({ timeout: 10000 })
  })

  test('Deal tab 貢献度 cell is clickable and shows input for editing', async ({ page }) => {
    await page.goto('/crm?tab=deals')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 15000 })

    // Find the 貢献度 column index from headers
    const headers = table.locator('thead th')
    const headerCount = await headers.count()
    let colIndex = -1
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent()
      if (text?.includes('貢献度')) {
        colIndex = i
        break
      }
    }
    expect(colIndex).toBeGreaterThanOrEqual(0)

    // Click the first data cell in the 貢献度 column
    const firstRow = table.locator('tbody tr').first()
    const cell = firstRow.locator('td').nth(colIndex)
    await expect(cell).toBeVisible({ timeout: 10000 })
    await cell.click()

    // After clicking, an input or editable element should appear
    const input = cell.locator('input')
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('Pipeline page shows CM% column that is editable', async ({ page }) => {
    await page.goto('/pipeline')
    await page.waitForURL(/\/pipeline/, { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    const table = page.locator('table')
    const hasTable = await table.first().isVisible({ timeout: 10000 }).catch(() => false)
    if (!hasTable) {
      test.skip(true, 'Pipeline table not visible — access may be restricted')
      return
    }

    // Check for CM% column header
    const header = table.locator('th', { hasText: 'CM%' })
    await expect(header).toBeVisible({ timeout: 10000 })

    // Click the first data cell in the CM% column
    const headers = table.locator('thead th')
    const headerCount = await headers.count()
    let colIndex = -1
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent()
      if (text?.includes('CM%')) {
        colIndex = i
        break
      }
    }
    expect(colIndex).toBeGreaterThanOrEqual(0)

    const firstRow = table.locator('tbody tr').first()
    const cell = firstRow.locator('td').nth(colIndex)
    await expect(cell).toBeVisible({ timeout: 10000 })
    await cell.click()

    // After clicking, an input or editable element should appear
    const input = cell.locator('input')
    await expect(input).toBeVisible({ timeout: 5000 })
  })
})
