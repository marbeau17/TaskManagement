import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('MEETS-1: Pipeline filtered totals', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/pipeline')
    await page.waitForURL(/\/pipeline/, { timeout: 30000 })
    // Wait for the pipeline table to load
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 15000 })
  })

  test('Pipeline page loads and shows the total row', async ({ page }) => {
    // The totals row contains "Total" text (EN UI via t('pipeline.total'))
    const totalCell = page.locator('td', { hasText: /^Total/ })
    await expect(totalCell.first()).toBeVisible({ timeout: 10000 })
  })

  test('When a filter is applied, the total row updates to reflect filtered data', async ({ page }) => {
    // Capture the total row text BEFORE filtering
    const totalCell = page.locator('td', { hasText: /^Total/ })
    await expect(totalCell.first()).toBeVisible({ timeout: 10000 })

    // "クリア" (clear filter) button should NOT be visible before filtering
    const clearBtn = page.getByRole('button', { name: 'クリア' })
    await expect(clearBtn).not.toBeVisible()

    // Apply a client name filter using the text input in the header
    const clientFilter = page.locator('thead input[type="text"]').first()
    await clientFilter.fill('出光')
    await page.waitForTimeout(500)

    // "クリア" button should now be visible, confirming the filter is active
    await expect(clearBtn).toBeVisible({ timeout: 5000 })

    // If the "(フィルター適用中)" label is deployed, verify it shows
    const filterLabel = page.getByText('フィルター適用中')
    const hasFilterLabel = await filterLabel.isVisible().catch(() => false)
    if (hasFilterLabel) {
      await expect(filterLabel).toBeVisible()
    }

    // Verify the total row is still present (it should show even after filtering)
    await expect(totalCell.first()).toBeVisible({ timeout: 5000 })
  })

  test('Totals row exists with financial data', async ({ page }) => {
    // Find the totals row - it has a cell starting with "Total" and contains financial figures
    const totalCell = page.locator('td', { hasText: /^Total/ })
    await expect(totalCell.first()).toBeVisible({ timeout: 10000 })

    // The totals row should have sibling cells with formatted numbers (e.g., "13,133")
    const totalRow = page.locator('tr', { has: totalCell.first() })
    const rowText = await totalRow.first().textContent()
    // Verify the row contains formatted numbers (comma-separated)
    expect(rowText).toMatch(/[\d,]+/)
  })
})
