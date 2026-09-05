import { expect, test } from '@playwright/test'

for (const theme of ['dark', 'light']) {
  test(`botão e campos mantêm contraste e foco no tema ${theme}`, async ({ page }, info) => {
    await page.addInitScript(selected => localStorage.setItem('livelab-theme', selected), theme)
    await page.goto('/login')
    const primaryButton = page.getByRole('button', { name: 'Entrar', exact: true })
    await expect(primaryButton).toBeVisible()
    await expect(primaryButton).toHaveCSS('background-color', theme === 'dark' ? 'rgb(255, 77, 28)' : 'rgb(255, 90, 31)')
    if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) {
      await primaryButton.hover()
      await expect(primaryButton).toHaveCSS('background-color', theme === 'dark' ? 'rgb(255, 106, 61)' : 'rgb(230, 74, 15)')
    }
    const email = page.getByLabel('E-mail', { exact: true })
    await email.focus()
    await expect(email).toBeFocused()
    const contrast = await page.evaluate(() => {
      const luminance = (css: string) => {
        const rgb = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(n => n / 255)
        return rgb.map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((v, n, i) => v + n * [.2126, .7152, .0722][i], 0)
      }
      const ratio = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
      const button = getComputedStyle(document.querySelector('button[type="submit"]')!)
      const input = document.querySelector('input[type="email"]')!
      const field = getComputedStyle(input)
      return {
        button: ratio(button.color, button.backgroundColor),
        placeholder: ratio(getComputedStyle(input, '::placeholder').color, field.backgroundColor),
        focus: ratio(field.borderColor, field.backgroundColor),
      }
    })
    expect(contrast.button).toBeGreaterThanOrEqual(4.5)
    expect(contrast.placeholder).toBeGreaterThanOrEqual(4.5)
    expect(contrast.focus).toBeGreaterThanOrEqual(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`login-${theme}.png`), fullPage: true })
  })
}
