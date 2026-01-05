import { HttpTypes } from "@medusajs/types"
import store from "@lib/mock/store.json"

export const listRegions = async function () {
  return store.regions as unknown as HttpTypes.StoreRegion[]
}

export const retrieveRegion = async function (id: string) {
  const region = (store.regions as unknown as HttpTypes.StoreRegion[]).find(
    (r) => r.id === id
  )
  if (!region) {
    throw new Error(`Region not found: ${id}`)
  }
  return region
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

export const getRegion = async function (countryCode: string) {
  try {
    if (regionMap.has(countryCode)) {
      return regionMap.get(countryCode)
    }

    const regions = await listRegions()

    if (!regions) {
      return null
    }

    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        regionMap.set(c?.iso_2 ?? "", region)
      })
    })

    const region = countryCode
      ? regionMap.get(countryCode)
      : regionMap.get("us")

    return region
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null
  }
}
