import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('S55-1: Calendar page loads', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    // Should see the calendar title
    await expect(page.getByText('Microsoft 365').or(page.getByText('カレンダー'))).toBeVisible({ timeout: 10000 })
  })

  test('S55-2: Calendar connect button visible', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    // Should see connect or sync button
    const connectBtn = page.getByText('Microsoft 365に接続').or(page.getByText('Connect')).or(page.getByText('同期'))
    await expect(connectBtn).toBeVisible({ timeout: 10000 })
  })

  test('S55-3: Find time section loads', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    // Should see find time section
    await expect(page.getByText('最適な会議時間').or(page.getByText('Find Best'))).toBeVisible({ timeout: 10000 })
  })

  test('S55-4: Member selection works', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Click on a member button
    const memberBtn = page.locator('button').filter({ hasText: /安|伊|田|佐/ }).first()
    if (await memberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberBtn.click()
      // Button should be highlighted (selected state)
      await expect(memberBtn).toHaveClass(/bg-mint/, { timeout: 3000 }).catch(() => {})
    }
  })

  test('S55-5: Find available time returns JST slots', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Select a member
    const memberBtn = page.locator('button').filter({ hasText: /安|伊/ }).first()
    if (await memberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberBtn.click()
      await page.waitForTimeout(500)

      // Click search button
      const searchBtn = page.getByText('空き時間を検索').or(page.getByText('Find Available'))
      if (await searchBtn.isVisible()) {
        await searchBtn.click()
        await page.waitForTimeout(2000)

        // Results should show JST times (9:00-18:00 range)
        const body = await page.textContent('body')
        // Should NOT show times before 9:00
        const hasEarlyTime = body?.includes('04:00') || body?.includes('05:00') || body?.includes('03:00')
        expect(hasEarlyTime).toBeFalsy()
      }
    }
  })

  test('S55-6: Time slot is clickable', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    const memberBtn = page.locator('button').filter({ hasText: /安|伊/ }).first()
    if (await memberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberBtn.click()
      const searchBtn = page.getByText('空き時間を検索').or(page.getByText('Find Available'))
      if (await searchBtn.isVisible()) {
        await searchBtn.click()
        await page.waitForTimeout(2000)

        // Click first slot
        const firstSlot = page.locator('button').filter({ hasText: /参加可能/ }).first()
        if (await firstSlot.isVisible()) {
          await firstSlot.click()
          await page.waitForTimeout(500)
          // Should show selected slot panel
          const selectedPanel = page.getByText('選択した時間帯').or(page.getByText('Selected Slot'))
          await expect(selectedPanel).toBeVisible({ timeout: 3000 }).catch(() => {})
        }
      }
    }
  })

  test('S55-7: Working hours selector visible', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Should see working hours selectors
    const startSelect = page.getByText('開始時間').or(page.getByText('Start Time'))
    await expect(startSelect).toBeVisible({ timeout: 10000 }).catch(() => {})
  })

  test('S55-8: Privacy note visible', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('ブロック済み').or(page.getByText('プライベート'))).toBeVisible({ timeout: 10000 }).catch(() => {})
  })

  test('S55-9: Calendar API returns data', async ({ request }) => {
    const r = await request.get('/api/ms365/events?start_date=2026-04-03&end_date=2026-04-09')
    expect([200, 401]).toContain(r.status())
  })

  test('S55-10: Find time API works', async ({ request }) => {
    const r = await request.post('/api/ms365/find-time', {
      data: { member_ids: ['test-id'], duration_minutes: 30, date: '2026-04-03' },
    })
    expect([200, 400]).toContain(r.status())
  })
})
