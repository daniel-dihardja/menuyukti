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
  })
})
