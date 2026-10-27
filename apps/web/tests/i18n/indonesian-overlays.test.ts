import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const messagesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../messages')

/** Namespaces wired in loadIndonesianOverlays (enabled features + shared shell). */
const EXPECTED_ID_FILES = [
  'accountMenu.json',
  'agentChat.json',
  'analytics.json',
  'appShell.json',
  'branches.json',
  'chat.json',
  'chatGatewayModels.json',
  'chatTools.json',
  'common.json',
  'cookieConsent.json',
  'docs.json',
  'errorBoundary.json',
  'igStudio.json',
  'landing.json',
  'legal.json',
  'login.json',
  'mainHeader.json',
  'media.json',
  'metadata.json',
  'notFound.json',
  'platform.json',
  'postCreator.json',
  'posts.json',
  'profile.json',
  'public.json',
  'pwaInstall.json',
  'services.json',
  'shop.json',
  'sidebar.json',
  'siteFooter.json',
  'staff.json',
  'upload.json',
  'usage.json',
  'wayfinding.json',
] as const

/** Disabled-feature catalogs must not be required as id overlays. */
const DISABLED_FEATURE_FILES = [
  'inventar.json',
  'playbooks.json',
  'explore.json',
  'guestHome.json',
  'workspaceTeam.json',
  'reels.json',
  'igstories.json',
  'agents.json',
  'news.json',
] as const

describe('Indonesian message overlays', () => {
  const idDir = path.join(messagesRoot, 'id')
  const files = readdirSync(idDir).filter((name) => name.endsWith('.json'))

  it('includes overlays for enabled features and shared shell', () => {
    expect(files.toSorted()).toEqual([...EXPECTED_ID_FILES].toSorted())
  })

  it('does not ship disabled-feature overlay files', () => {
    for (const name of DISABLED_FEATURE_FILES) {
      expect(files).not.toContain(name)
    }
  })

  it('parses every overlay as JSON with a single top-level namespace object', () => {
    for (const name of files) {
      const raw = readFileSync(path.join(idDir, name), 'utf8')
      const data = JSON.parse(raw) as Record<string, unknown>
      expect(Object.keys(data).length).toBeGreaterThanOrEqual(1)
      for (const value of Object.values(data)) {
        expect(value).toBeTypeOf('object')
      }
    }
  })

  it('scopes public and services overlays to enabled guest surfaces', () => {
    const publicOverlay = JSON.parse(readFileSync(path.join(idDir, 'public.json'), 'utf8')) as {
      public: Record<string, unknown>
    }
    expect(Object.keys(publicOverlay.public).toSorted()).toEqual(
      ['guest', 'locationHome', 'menu', 'voting'].toSorted(),
    )

    const servicesOverlay = JSON.parse(readFileSync(path.join(idDir, 'services.json'), 'utf8')) as {
      services: Record<string, unknown>
    }
    expect(servicesOverlay.services.digitalMenu).toBeTruthy()
    expect(servicesOverlay.services.voting).toBeTruthy()
    expect(servicesOverlay.services).not.toHaveProperty('pickupOffer')
    expect(servicesOverlay.services).not.toHaveProperty('prediction')
    expect(servicesOverlay.services).not.toHaveProperty('pointSystem')
  })

  it('scopes platform overlay to admin-enabled subsections only', () => {
    const platformOverlay = JSON.parse(readFileSync(path.join(idDir, 'platform.json'), 'utf8')) as {
      platform: Record<string, unknown>
    }
    expect(Object.keys(platformOverlay.platform).toSorted()).toEqual(
      ['calendar', 'crm', 'printOrders'].toSorted(),
    )
  })
})
