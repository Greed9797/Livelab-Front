import { expect, test } from '@playwright/test'

test('o botão primário usa rosa nos estados padrão e hover', async ({ page }) => {
  await page.goto('/login')

  const primaryButton = page.getByRole('button', { name: 'Entrar' })
  await expect(primaryButton).toBeVisible()
  await expect(primaryButton).toHaveCSS('background-color', 'oklch(0.592 0.249 0.584)')

  await primaryButton.hover()
  await expect(primaryButton).toHaveCSS('background-color', 'oklch(0.525 0.223 3.958)')
})
