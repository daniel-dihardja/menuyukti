export const PROFILE_AVATAR_PRESETS = [
  {
    id: 'sunda',
    src: '/images/avatars/sunda.webp',
    labelKey: 'avatarPresetSunda',
  },
  {
    id: 'majapahit',
    src: '/images/avatars/majapahit.webp',
    labelKey: 'avatarPresetMajapahit',
  },
  {
    id: 'bali',
    src: '/images/avatars/bali.webp',
    labelKey: 'avatarPresetBali',
  },
] as const

export type ProfileAvatarPreset = (typeof PROFILE_AVATAR_PRESETS)[number]
export type ProfileAvatarPresetLabelKey = ProfileAvatarPreset['labelKey']
