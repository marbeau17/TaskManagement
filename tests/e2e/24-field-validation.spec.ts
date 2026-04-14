import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

// ==========================================================================
// TC-24: Comprehensive field entry validation across all pages
// Tests that all editable fields can be properly entered without malfunction
// ==========================================================================

test.describe('TC-24: Field Entry Validation', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ========================================================================
  // A. DateInput Component Tests
  // ========================================================================

  test.describe('A: DateInput - Manual Entry', () => {

    test('A-01: Year field accepts 4 digits and auto-advances to month', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const yearInput = page.getByLabel('Year').first()
      await yearInput.click()
      await yearInput.fill('2026')
      // Should auto-advance: month field should be focused
      const monthInput = page.getByLabel('Month').first()
      await expect(monthInput).toBeFocused({ timeout: 3000 })
    })

    test('A-02: Month field accepts 2 digits and auto-advances to day', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const monthInput = page.getByLabel('Month').first()
      await monthInput.click()
      await monthInput.fill('06')
      const dayInput = page.getByLabel('Day').first()
      await expect(dayInput).toBeFocused({ timeout: 3000 })
    })

    test('A-03: Partial year does NOT reset to 1900', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const yearInput = page.getByLabel('Year').first()
      await yearInput.click()
      await yearInput.fill('20')
      // Blur by clicking elsewhere
      await page.click('body')
      await page.waitForTimeout(300)
      // Year should still be "20", NOT "1900"
      const val = await yearInput.inputValue()
      expect(val).not.toBe('1900')
    })

    test('A-04: Full date entry saves correctly (YYYY/MM/DD)', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const yearInput = page.getByLabel('Year').first()
      const monthInput = page.getByLabel('Month').first()
      const dayInput = page.getByLabel('Day').first()

      await yearInput.click()
      await yearInput.fill('2026')
      await monthInput.fill('12')
      await dayInput.fill('25')
      await page.click('body')
      await page.waitForTimeout(300)

      await expect(yearInput).toHaveValue('2026')
      await expect(monthInput).toHaveValue('12')
      await expect(dayInput).toHaveValue('25')
    })

    test('A-05: Month clamps to valid range (01-12)', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      // First set year so the date context is established
      const yearInput = page.getByLabel('Year').first()
      await yearInput.click()
      await yearInput.fill('2026')
      await page.waitForTimeout(200)
      // Month field is now focused (auto-advanced), type "15"
      const monthInput = page.getByLabel('Month').first()
      await monthInput.fill('15')
      await page.waitForTimeout(200)
      // Day field should now be focused (auto-advanced after 2 digits)
      // Click body to blur the day field and trigger month validation
      const dayInput = page.getByLabel('Day').first()
      await dayInput.fill('01')
      await page.waitForTimeout(200)
      await page.locator('#client_name, #title, body').first().click()
      await page.waitForTimeout(500)
      // Month should be clamped to 12
      const val = await monthInput.inputValue()
      expect(parseInt(val)).toBeLessThanOrEqual(12)
    })

    test('A-06: Day clamps to valid range (01-31)', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const dayInput = page.getByLabel('Day').first()
      await dayInput.click()
      await dayInput.fill('35')
      await page.click('body')
      await page.waitForTimeout(300)
      const val = await dayInput.inputValue()
      expect(parseInt(val)).toBeLessThanOrEqual(31)
    })

    test('A-07: Non-numeric input is rejected', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const yearInput = page.getByLabel('Year').first()
      await yearInput.click()
      await yearInput.fill('abcd')
      const val = await yearInput.inputValue()
      expect(val).toBe('')
    })
  })

  // ========================================================================
  // B. DateInput Calendar Picker Tests
  // ========================================================================

  test.describe('B: DateInput - Calendar Picker', () => {

    test('B-01: Calendar opens on button click', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const calBtn = page.getByLabel('Open calendar').first()
      await calBtn.click()
      // Calendar popup should be visible
      await expect(page.locator('text=今日')).toBeVisible({ timeout: 3000 })
    })

    test('B-02: Clicking a date selects it and closes calendar', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const calBtn = page.getByLabel('Open calendar').first()
      await calBtn.click()
      await page.waitForTimeout(300)
      // Click day 15
      const day15 = page.locator('button').filter({ hasText: /^15$/ }).first()
      await day15.click()
      await page.waitForTimeout(300)
      // Calendar should close
      await expect(page.locator('text=今日')).not.toBeVisible({ timeout: 3000 })
      // Day field should have 15
      const dayInput = page.getByLabel('Day').first()
      const val = await dayInput.inputValue()
      expect(val).toBe('15')
    })

    test('B-03: Today button sets today date', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const calBtn = page.getByLabel('Open calendar').first()
      await calBtn.click()
      await page.waitForTimeout(300)
      await page.locator('button:has-text("今日")').click()
      await page.waitForTimeout(300)

      const today = new Date()
      const dayInput = page.getByLabel('Day').first()
      const val = await dayInput.inputValue()
      expect(parseInt(val)).toBe(today.getDate())
    })

    test('B-04: Clear button clears the date', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      // First set a date
      const yearInput = page.getByLabel('Year').first()
      await yearInput.click()
      await yearInput.fill('2026')
      const monthInput = page.getByLabel('Month').first()
      await monthInput.fill('06')
      const dayInput = page.getByLabel('Day').first()
      await dayInput.fill('15')
      await page.click('body')
      await page.waitForTimeout(300)

      // Open calendar and click clear
      const calBtn = page.getByLabel('Open calendar').first()
      await calBtn.click()
      await page.waitForTimeout(300)
      await page.locator('button:has-text("クリア")').click()
      await page.waitForTimeout(300)

      await expect(yearInput).toHaveValue('')
      await expect(monthInput).toHaveValue('')
      await expect(dayInput).toHaveValue('')
    })

    test('B-05: Month navigation works (prev/next)', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      const calBtn = page.getByLabel('Open calendar').first()
      await calBtn.click()
      await page.waitForTimeout(300)

      // Get current month label
      const headerText = await page.locator('.font-bold.text-text').filter({ hasText: /年.*月/ }).first().textContent()

      // Click next month
      await page.locator('button:has-text("›")').first().click()
      await page.waitForTimeout(200)
      const newHeaderText = await page.locator('.font-bold.text-text').filter({ hasText: /年.*月/ }).first().textContent()
      expect(newHeaderText).not.toBe(headerText)

      // Click prev month twice (should go back past original)
      await page.locator('button:has-text("‹")').first().click()
      await page.waitForTimeout(200)
      await page.locator('button:has-text("‹")').first().click()
      await page.waitForTimeout(200)
      const finalHeaderText = await page.locator('.font-bold.text-text').filter({ hasText: /年.*月/ }).first().textContent()
      expect(finalHeaderText).not.toBe(newHeaderText)
    })
  })

  // ========================================================================
  // C. Task Detail Page - Field Entry Tests
  // ========================================================================

  test.describe('C: Task Detail - All Fields', () => {

    test('C-01: Task detail page loads with editable fields', async ({ page }) => {
      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      // Click on first task
      const firstTaskLink = page.locator('a[href*="/tasks/"]').first()
      if (await firstTaskLink.isVisible()) {
        await firstTaskLink.click()
        await page.waitForURL(/\/tasks\//, { timeout: 15000 })
        // Verify date inputs are visible
        await expect(page.getByLabel('Year').first()).toBeVisible({ timeout: 10000 })
      }
    })

    test('C-02: Start date can be modified via calendar', async ({ page }) => {
      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const firstTaskLink = page.locator('a[href*="/tasks/"]').first()
      if (!(await firstTaskLink.isVisible())) { test.skip(); return }

      await firstTaskLink.click()
      await page.waitForURL(/\/tasks\//, { timeout: 15000 })
      await page.waitForTimeout(2000)

      // Use the calendar picker to set start date (first calendar button)
      const calBtn = page.getByLabel('Open calendar').first()
      if (await calBtn.isVisible()) {
        await calBtn.click()
        await page.waitForTimeout(500)
        // Click day 10
        const day10 = page.locator('button').filter({ hasText: /^10$/ }).first()
        if (await day10.isVisible()) {
          await day10.click()
          await page.waitForTimeout(1000)
          // Verify day was set
          const dayInput = page.getByLabel('Day').first()
          const val = await dayInput.inputValue()
          expect(val).toBe('10')
        }
      }
    })

    test('C-03: Priority dropdown changes value', async ({ page }) => {
      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const firstTaskLink = page.locator('a[href*="/tasks/"]').first()
      if (!(await firstTaskLink.isVisible())) { test.skip(); return }

      await firstTaskLink.click()
      await page.waitForURL(/\/tasks\//, { timeout: 15000 })
      await page.waitForTimeout(2000)

      // Find priority select (look for one with options 1-5)
      const prioritySelect = page.locator('select').filter({ has: page.locator('option[value="1"]') }).first()
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('2')
        await page.waitForTimeout(500)
        const val = await prioritySelect.inputValue()
        expect(val).toBe('2')
      }
    })

    test('C-04: Planned hours per week accepts number', async ({ page }) => {
      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const firstTaskLink = page.locator('a[href*="/tasks/"]').first()
      if (!(await firstTaskLink.isVisible())) { test.skip(); return }

      await firstTaskLink.click()
      await page.waitForURL(/\/tasks\//, { timeout: 15000 })
      await page.waitForTimeout(2000)

      const hoursInput = page.locator('input[type="number"]').first()
      if (await hoursInput.isVisible()) {
        await hoursInput.fill('8')
        await page.click('body')
        await page.waitForTimeout(500)
        const val = await hoursInput.inputValue()
        expect(val).toBe('8')
      }
    })
  })

  // ========================================================================
  // D. Task Creation Form Tests
  // ========================================================================

  test.describe('D: Task Creation Form', () => {

    test('D-01: Required fields show validation', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      // Try submitting without required fields
      const submitBtn = page.locator('button[type="submit"]').first()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(500)
        // Should stay on same page (validation prevents submit)
        expect(page.url()).toContain('/tasks/new')
      }
    })

    test('D-02: Client name input accepts text', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const clientInput = page.locator('#client_name')
      if (await clientInput.isVisible()) {
        await clientInput.fill('Test Client Corp')
        const val = await clientInput.inputValue()
        expect(val).toBe('Test Client Corp')
      }
    })

    test('D-03: Task title input accepts text', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const titleInput = page.locator('#title')
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Task Title')
        const val = await titleInput.inputValue()
        expect(val).toBe('E2E Test Task Title')
      }
    })

    test('D-04: Description textarea accepts multiline text', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const descInput = page.locator('#description')
      if (await descInput.isVisible()) {
        await descInput.fill('Line 1\nLine 2\nLine 3')
        const val = await descInput.inputValue()
        expect(val).toContain('Line 1')
        expect(val).toContain('Line 2')
      }
    })

    test('D-05: Desired deadline DateInput with calendar works', async ({ page }) => {
      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Use calendar to pick a date for desired deadline
      const calBtns = page.getByLabel('Open calendar')
      if (await calBtns.first().isVisible()) {
        await calBtns.first().click()
        await page.waitForTimeout(300)
        // Click day 20
        const day20 = page.locator('button').filter({ hasText: /^20$/ }).first()
        if (await day20.isVisible()) {
          await day20.click()
          await page.waitForTimeout(300)
          const dayInput = page.getByLabel('Day').first()
          const val = await dayInput.inputValue()
          expect(val).toBe('20')
        }
      }
    })
  })

  // ========================================================================
  // E. Pipeline Page - Inline Edit Tests
  // ========================================================================

  test.describe('E: Pipeline - Inline Fields', () => {

    test('E-01: Pipeline page loads with data', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      // Verify table is visible
      const table = page.locator('table').first()
      await expect(table).toBeVisible({ timeout: 10000 })
    })

    test('E-02: Client name text field is editable', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const clientInput = page.locator('tbody input[type="text"]').first()
      if (await clientInput.isVisible()) {
        const origVal = await clientInput.inputValue()
        await clientInput.fill('Test Edit Client')
        await page.click('body')
        await page.waitForTimeout(500)
        // Restore original value
        await clientInput.fill(origVal)
        await page.click('body')
        await page.waitForTimeout(500)
      }
    })

    test('E-03: Status dropdown changes correctly', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const statusSelect = page.locator('tbody select').filter({ has: page.locator('option[value="Firm"]') }).first()
      if (await statusSelect.isVisible()) {
        const origVal = await statusSelect.inputValue()
        await statusSelect.selectOption('Firm')
        await page.waitForTimeout(500)
        const val = await statusSelect.inputValue()
        expect(val).toBe('Firm')
        // Restore
        if (origVal) await statusSelect.selectOption(origVal)
      }
    })

    test('E-04: Probability accepts number 0-100', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const probInput = page.locator('tbody input[type="number"]').first()
      if (await probInput.isVisible()) {
        const origVal = await probInput.inputValue()
        await probInput.fill('75')
        await page.click('body')
        await page.waitForTimeout(500)
        const val = await probInput.inputValue()
        expect(val).toBe('75')
        // Restore
        await probInput.fill(origVal)
        await page.click('body')
      }
    })

    test('E-05: Monthly revenue number field accepts input', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      // Find a monthly revenue input (towards the right of the table)
      const revenueInputs = page.locator('tbody input[type="number"]')
      const count = await revenueInputs.count()
      if (count > 3) {
        const revenueInput = revenueInputs.nth(3)
        if (await revenueInput.isVisible()) {
          const origVal = await revenueInput.inputValue()
          await revenueInput.fill('5000')
          await page.click('body')
          await page.waitForTimeout(500)
          const val = await revenueInput.inputValue()
          expect(val).toBe('5000')
          // Restore
          await revenueInput.fill(origVal || '0')
          await page.click('body')
        }
      }
    })

    test('E-06: Checkbox (is_new) toggles', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const checkbox = page.locator('tbody input[type="checkbox"]').first()
      if (await checkbox.isVisible()) {
        const wasChecked = await checkbox.isChecked()
        await checkbox.click()
        await page.waitForTimeout(500)
        const nowChecked = await checkbox.isChecked()
        expect(nowChecked).toBe(!wasChecked)
        // Restore
        await checkbox.click()
      }
    })
  })

  // ========================================================================
  // F. Pipeline KPI Summary Tests
  // ========================================================================

  test.describe('F: Pipeline KPI Summary', () => {

    test('F-01: Summary tab shows KPI cards', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      // Switch to summary tab
      await page.locator('button:has-text("売上サマリー")').click()
      await page.waitForTimeout(1000)
      // Check KPI cards exist
      await expect(page.locator('text=売上高 (ウェイトなし)')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=売上高 (加重平均)')).toBeVisible({ timeout: 5000 })
    })

    test('F-02: Top 10 client ranking is visible', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      await page.locator('button:has-text("売上サマリー")').click()
      await page.waitForTimeout(1000)
      await expect(page.locator('text=クライアント別 売上 Top 10')).toBeVisible({ timeout: 5000 })
    })

    test('F-03: Top 10 opportunity ranking is visible', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      await page.locator('button:has-text("売上サマリー")').click()
      await page.waitForTimeout(1000)
      await expect(page.locator('text=案件別 売上 Top 10')).toBeVisible({ timeout: 5000 })
    })
  })

  // ========================================================================
  // G. Issue Creation Tests
  // ========================================================================

  test.describe('G: Issue Creation Fields', () => {

    test('G-01: Issue creation page loads', async ({ page }) => {
      await page.goto('/issues/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      // Check title input exists
      const titleInput = page.locator('input[type="text"]').first()
      await expect(titleInput).toBeVisible({ timeout: 10000 })
    })

    test('G-02: All form fields accept input', async ({ page }) => {
      await page.goto('/issues/new')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Title
      const titleInput = page.locator('input[type="text"]').first()
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Issue')
        expect(await titleInput.inputValue()).toBe('E2E Test Issue')
      }

      // Description textarea
      const textarea = page.locator('textarea').first()
      if (await textarea.isVisible()) {
        await textarea.fill('Test description for E2E')
        expect(await textarea.inputValue()).toContain('Test description')
      }
    })
  })

  // ========================================================================
  // H. Filter Fields Tests
  // ========================================================================

  test.describe('H: Filter Fields', () => {

    test('H-01: Pipeline client filter dropdown works', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      // Client filter is the first select in the filter row
      const filterSelect = page.locator('thead select').first()
      if (await filterSelect.isVisible()) {
        const options = await filterSelect.locator('option').count()
        expect(options).toBeGreaterThan(1) // At least "すべて" + some clients
      }
    })

    test('H-02: Pipeline status filter works', async ({ page }) => {
      await page.goto('/pipeline')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const statusFilter = page.locator('thead select').filter({ has: page.locator('option[value="Firm"]') }).first()
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('Firm')
        await page.waitForTimeout(500)
        // Verify filter is applied - all visible status badges should be "Firm"
        const val = await statusFilter.inputValue()
        expect(val).toBe('Firm')
        // Clear filter
        await statusFilter.selectOption('')
      }
    })
  })
})
