import { describe, expect, it } from 'vitest'

import {
  IG_MENU_PICKER_NONE_SELECTED_SENTINEL,
  isIgMenuPickerSlotSelected,
  toggleIgMenuPickerSlotKey,
} from '@/lib/milestones/ig-menu-picker-input'

const ALL = ['monday-morning', 'tuesday-lunch', 'wednesday-dinner']

describe('ig menu picker slot selection', () => {
  it('empty selectedSlotKeys means all slots are selected', () => {
    expect(isIgMenuPickerSlotSelected('monday-morning', [])).toBe(true)
  })

  it('none-selected sentinel means no slots are selected', () => {
    expect(
      isIgMenuPickerSlotSelected('monday-morning', [IG_MENU_PICKER_NONE_SELECTED_SENTINEL]),
    ).toBe(false)
  })

  it('checking one slot after clear all selects only that slot', () => {
    expect(
      toggleIgMenuPickerSlotKey(
        [IG_MENU_PICKER_NONE_SELECTED_SENTINEL],
        ALL,
        'tuesday-lunch',
        true,
      ),
    ).toEqual(['tuesday-lunch'])
  })

  it('unchecking one slot from all selected keeps the rest explicit', () => {
    expect(toggleIgMenuPickerSlotKey([], ALL, 'tuesday-lunch', false)).toEqual([
      'monday-morning',
      'wednesday-dinner',
    ])
  })

  it('checking the last missing slot normalizes back to all selected', () => {
    expect(
      toggleIgMenuPickerSlotKey(['monday-morning', 'wednesday-dinner'], ALL, 'tuesday-lunch', true),
    ).toEqual([])
  })

  it('unchecking the only selected slot returns none-selected sentinel', () => {
    expect(toggleIgMenuPickerSlotKey(['tuesday-lunch'], ALL, 'tuesday-lunch', false)).toEqual([
      IG_MENU_PICKER_NONE_SELECTED_SENTINEL,
    ])
  })
})
