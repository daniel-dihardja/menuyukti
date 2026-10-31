import { describe, expect, it } from 'vitest'

import { loadMessages } from '@/i18n/load-messages'

describe('loadMessages id smoke', () => {
  it('deep-merges Indonesian overlays onto English', async () => {
    const messages = await loadMessages('id')
    const accountMenu = messages.accountMenu as { profile?: string; languageId?: string }
    expect(accountMenu.profile).toBe('Profil')
    expect(accountMenu.languageId).toBe('Indonesia')

    const sidebar = messages.sidebar as { chat?: string }
    expect(sidebar.chat).toBe('Analitik AI')

    const publicMessages = messages.public as { menu?: { empty?: string } }
    expect(publicMessages.menu?.empty).toBe('Belum ada menu — cek lagi nanti.')

    // Disabled inventar catalog stays English via base merge
    const inventar = messages.inventar as { title?: string }
    expect(inventar?.title).toBe('Inventar')

    const legal = messages.legal as { impressum?: { title?: string } }
    expect(legal.impressum?.title).toBe('Impressum')
  })
})

describe('loadMessages de smoke', () => {
  it('deep-merges German legal overlays onto English', async () => {
    const messages = await loadMessages('de')
    const legal = messages.legal as {
      impressum?: { title?: string; sections?: { address?: { title?: string } } }
      privacy?: { title?: string }
    }
    expect(legal.impressum?.title).toBe('Impressum')
    expect(legal.impressum?.sections?.address?.title).toBe('Anschrift')
    expect(legal.privacy?.title).toBe('Privacy Policy')

    const siteFooter = messages.siteFooter as { impressum?: string; privacy?: string }
    expect(siteFooter.impressum).toBe('Impressum')
    expect(siteFooter.privacy).toBe('Datenschutz')
  })
})
