import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('WEB-3: Custom DateInput with Tab key navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks/new')
    await page.waitForURL(/\/tasks\/new/, { timeout: 30000 })
  })

  test('date input fields exist on /tasks/new (desired_deadline)', async ({ page }) => {
    // The DateInput component renders a hidden input with id="desired_deadline"
    // and three visible segment inputs with aria-labels
    const yearSegment = page.getByLabel('Year')
    const monthSegment = page.getByLabel('Month')
    const daySegment = page.getByLabel('Day')

    await expect(yearSegment.first()).toBeVisible({ timeout: 15000 })
    await expect(monthSegment.first()).toBeVisible()
    await expect(daySegment.first()).toBeVisible()
  })

  test('date input has 3 segments (YYYY, MM, DD) with "/" separators', async ({ page }) => {
    // The DateInput wraps segments in a <span> container
    // Each segment has a placeholder: YYYY, MM, DD
    const yearSegment = page.getByLabel('Year').first()
    const monthSegment = page.getByLabel('Month').first()
    const daySegment = page.getByLabel('Day').first()

    await expect(yearSegment).toBeVisible({ timeout: 15000 })
    await expect(yearSegment).toHaveAttribute('placeholder', 'YYYY')
    await expect(monthSegment).toHaveAttribute('placeholder', 'MM')
    await expect(daySegment).toHaveAttribute('placeholder', 'DD')

    // Verify "/" separators exist between segments
    // The DateInput component renders <span> elements with "/" text
    const container = yearSegment.locator('..')
    const slashes = container.locator('span.select-none')
    await expect(slashes).toHaveCount(2)
    await expect(slashes.first()).toHaveText('/')
    await expect(slashes.last()).toHaveText('/')
  })

  test('after entering 4 digits in year, focus auto-advances to month', async ({ page }) => {
    const yearSegment = page.getByLabel('Year').first()
    const monthSegment = page.getByLabel('Month').first()

    await expect(yearSegment).toBeVisible({ timeout: 15000 })
    await yearSegment.click()
    await yearSegment.fill('')
    await yearSegment.pressSequentially('2026')

    // After typing 4 digits, focus should auto-advance to month
    await expect(monthSegment).toBeFocused({ timeout: 3000 })
  })

  test('Tab key from year moves to month, not away from component', async ({ page }) => {
    const yearSegment = page.getByLabel('Year').first()
    const monthSegment = page.getByLabel('Month').first()
    const daySegment = page.getByLabel('Day').first()

    await expect(yearSegment).toBeVisible({ timeout: 15000 })
    await yearSegment.click()
    await yearSegment.press('Tab')

    // Tab from year should move focus to month segment
    await expect(monthSegment).toBeFocused({ timeout: 3000 })

    // Tab from month should move focus to day segment
    await monthSegment.press('Tab')
    await expect(daySegment).toBeFocused({ timeout: 3000 })

    // Shift+Tab from day should go back to month
    await daySegment.press('Shift+Tab')
    await expect(monthSegment).toBeFocused({ timeout: 3000 })

    // Shift+Tab from month should go back to year
    await monthSegment.press('Shift+Tab')
    await expect(yearSegment).toBeFocused({ timeout: 3000 })
  })
})
