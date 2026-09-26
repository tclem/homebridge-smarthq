/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * coffeeMaker.ts: @homebridge-plugins/homebridge-smarthq.
 */
import type { PlatformAccessory } from 'homebridge'

import type { SmartHQPlatform } from '../platform.js'
import type { devicesConfig, SmartHqContext } from '../settings.js'

import { ERD_TYPES } from '../settings.js'
import { deviceBase } from './device.js'

function encodeByte(value: string | undefined, name: string): string {
  const normalized = value?.trim().replace(/^0x/i, '')
  if (!normalized || !/^[0-9a-f]{1,2}$/i.test(normalized)) {
    throw new Error(`Coffee Maker ${name} is unavailable or invalid: ${value ?? 'missing'}`)
  }
  return normalized.padStart(2, '0').toUpperCase()
}

export function encodeCoffeeMakerBrewSettings(
  strength: string | undefined,
  temperature: string | undefined,
  cups: string | undefined,
): string {
  return [
    encodeByte(strength, 'brew strength'),
    encodeByte(temperature, 'brew temperature'),
    encodeByte(cups, 'brew cups'),
  ].join('')
}

export const DEFAULT_COFFEE_MAKER_BREW_SETTINGS = encodeCoffeeMakerBrewSettings('04', 'C8', '0A')

export function isCoffeeMakerBrewing(value: string | undefined): boolean {
  const normalized = value?.trim().replace(/^0x/i, '')
  return normalized !== undefined
    && /^[0-9a-f]+$/i.test(normalized)
    && Number.parseInt(normalized, 16) !== 0
}

export class SmartHQCoffeeMaker extends deviceBase {
  constructor(
    readonly platform: SmartHQPlatform,
    accessory: PlatformAccessory<SmartHqContext>,
    readonly device: SmartHqContext['device'] & devicesConfig,
  ) {
    super(platform, accessory, device)
    this.debugLog(`Coffee Maker Features: ${JSON.stringify(accessory.context.device.features)}`)

    // Coffee Maker Brewing State (Valve)
    const brewValve = this.accessory!.getService('Coffee Maker') ?? this.accessory!.addService(this.platform.Service.Valve, 'Coffee Maker', 'CoffeeMaker')
    this.setServiceName(brewValve, 'Coffee Maker')
    brewValve.setCharacteristic(this.platform.Characteristic.ValveType, this.platform.Characteristic.ValveType.GENERIC_VALVE)
    brewValve
      .getCharacteristic(this.platform.Characteristic.Active)
      .onGet(async () => {
        return isCoffeeMakerBrewing(await this.readErd(ERD_TYPES.CCM_IS_BREWING))
          ? this.platform.Characteristic.Active.ACTIVE
          : this.platform.Characteristic.Active.INACTIVE
      })
      .onSet(async (value) => {
        if (value === this.platform.Characteristic.Active.ACTIVE) {
          await this.writeErd(
            ERD_TYPES.CCM_BREW_SETTINGS,
            DEFAULT_COFFEE_MAKER_BREW_SETTINGS,
          )
        } else {
          await this.writeErd(ERD_TYPES.CCM_CANCEL_BREWING, true)
        }
      })

    brewValve
      .getCharacteristic(this.platform.Characteristic.InUse)
      .onGet(async () => {
        return isCoffeeMakerBrewing(await this.readErd(ERD_TYPES.CCM_IS_BREWING))
          ? this.platform.Characteristic.InUse.IN_USE
          : this.platform.Characteristic.InUse.NOT_IN_USE
      })

    // Water Level Sensor (Humidity as proxy)
    const waterLevel = this.accessory!.getService('Water Level') ?? this.accessory!.addService(this.platform.Service.HumiditySensor, 'Water Level', 'WaterLevel')
    this.setServiceName(waterLevel, 'Water Level')
    waterLevel
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(async () => {
        try {
          // TODO: Implement water level ERD (0-100%)
          return 100
        } catch (error: any) {
          this.warnLog?.(`Coffee Maker Water Level error: ${error?.message ?? error}`)
          return 0
        }
      })

    // Filter/Cleaning Status
    const filterService = this.accessory!.getService('Coffee Filter') ?? this.accessory!.addService(this.platform.Service.FilterMaintenance, 'Coffee Filter', 'CoffeeFilter')
    this.setServiceName(filterService, 'Coffee Filter')
    filterService
      .getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .onGet(async () => {
        try {
          // TODO: Implement filter/cleaning status ERD
          return this.platform.Characteristic.FilterChangeIndication.FILTER_OK
        } catch (error: any) {
          this.warnLog?.(`Coffee Filter Status error: ${error?.message ?? error}`)
          return this.platform.Characteristic.FilterChangeIndication.FILTER_OK
        }
      })
  }
}
