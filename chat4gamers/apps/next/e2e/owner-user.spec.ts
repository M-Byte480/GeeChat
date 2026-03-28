/**
 * owner-user.spec.ts
 *
 * Two Playwright browser contexts — owner and user — each pre-loaded with a
 * different identity via localStorage injection.  The identities and their
 * session tokens were seeded into a fresh SQLite database by global-setup.ts.
 *
 * context.addInitScript() runs before the page's own scripts on every
 * navigation, so localStorage is populated before IdentityGate mounts.
 * That means neither context ever sees the WelcomeScreen — they land straight
 * in the authenticated app.
 */
import {
  type Browser,
  type BrowserContext,
  expect,
  test,
} from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { E2E_FIXTURES_PATH } from './global-setup.ts'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

// ── Load fixtures written by global-setup ─────────────────────────────────────

interface Fixtures {
  ownerIdentity: string
  userIdentity: string
  ownerPublicKey: string
  userPublicKey: string
  serverUrl: string
}

function loadFixtures(): Fixtures {
  return JSON.parse(readFileSync(E2E_FIXTURES_PATH, 'utf8'))
}

// ── Context factory ───────────────────────────────────────────────────────────

/**
 * Creates an isolated browser context with the given identity pre-loaded into
 * localStorage.  The init script runs before any page script, so IdentityGate
 * reads the identity on first mount without going through WelcomeScreen.
 */
async function createSessionContext(
  browser: Browser,
  identityJson: string
): Promise<BrowserContext> {
  const context = await browser.newContext()

  // Inject identity into localStorage before the page's own scripts run
  await context.addInitScript((json) => {
    localStorage.setItem('geechat-identity', json)
  }, identityJson)

  return context
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Two authenticated sessions', () => {
  test('owner and user load into the app with separate identities', async ({
    browser,
  }) => {
    const { ownerIdentity, userIdentity } = loadFixtures()

    const ownerCtx = await createSessionContext(browser, ownerIdentity)
    const userCtx = await createSessionContext(browser, userIdentity)

    const ownerPage = await ownerCtx.newPage()
    const userPage = await userCtx.newPage()

    await ownerPage.goto('/')
    await userPage.goto('/')

    await ownerPage.waitForLoadState('networkidle')
    await userPage.waitForLoadState('networkidle')

    // Neither context should see the WelcomeScreen — identities were injected
    await expect(ownerPage.getByText('Create New Identity')).not.toBeVisible()
    await expect(userPage.getByText('Create New Identity')).not.toBeVisible()

    // Each page shows the correct username
    await expect(ownerPage.getByText('E2EOwner')).toBeVisible()
    await expect(userPage.getByText('E2EUser')).toBeVisible()

    // Sanity check: the pages don't share state — owner doesn't see user's name prominently
    await expect(ownerPage.getByText('E2EUser')).not.toBeVisible()

    await ownerCtx.close()
    await userCtx.close()
  })

  test('localStorage is isolated between contexts', async ({ browser }) => {
    const { ownerIdentity, userIdentity } = loadFixtures()

    const ownerCtx = await createSessionContext(browser, ownerIdentity)
    const userCtx = await createSessionContext(browser, userIdentity)

    const ownerPage = await ownerCtx.newPage()
    const userPage = await userCtx.newPage()

    await ownerPage.goto('/')
    await userPage.goto('/')

    // Read back what each context stored in localStorage
    const ownerStored = await ownerPage.evaluate(() =>
      localStorage.getItem('geechat-identity')
    )
    const userStored = await userPage.evaluate(() =>
      localStorage.getItem('geechat-identity')
    )

    const ownerParsed = JSON.parse(ownerStored!)
    const userParsed = JSON.parse(userStored!)

    expect(ownerParsed.username).toBe('E2EOwner')
    expect(userParsed.username).toBe('E2EUser')

    // Confirm they are genuinely different (different public keys)
    expect(ownerParsed.publicKey).not.toBe(userParsed.publicKey)

    await ownerCtx.close()
    await userCtx.close()
  })
})
