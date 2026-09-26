import { describe, expect, it } from 'vitest'

import { encodeCoffeeMakerBrewSettings, isCoffeeMakerBrewing } from './coffeeMaker.js'

describe('encodeCoffeeMakerBrewSettings', () => {
  it('encodes strength, temperature, and cups in SmartHQ command order', () => {
    expect(encodeCoffeeMakerBrewSettings('02', 'cd', '08')).toBe('02CD08')
  })

  it('normalizes single-byte values and optional hex prefixes', () => {
    expect(encodeCoffeeMakerBrewSettings('0x4', '0xC8', 'a')).toBe('04C80A')
  })

  it.each([
    [undefined, 'C8', '08'],
    ['02', '', '08'],
    ['02', 'C8', 'coffee'],
    ['100', 'C8', '08'],
  ])('rejects missing or invalid settings', (strength, temperature, cups) => {
    expect(() => encodeCoffeeMakerBrewSettings(strength, temperature, cups)).toThrow()
  })
})

describe('isCoffeeMakerBrewing', () => {
  it('recognizes the active brewing state', () => {
    expect(isCoffeeMakerBrewing('01')).toBe(true)
  })

  it('treats zero and unavailable values as inactive', () => {
    expect(isCoffeeMakerBrewing('00')).toBe(false)
    expect(isCoffeeMakerBrewing(undefined)).toBe(false)
    expect(isCoffeeMakerBrewing('invalid')).toBe(false)
  })
})
