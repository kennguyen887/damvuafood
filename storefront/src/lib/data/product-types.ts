import { HttpTypes } from "@medusajs/types"
import store from "@lib/mock/store.json"

export const getProductTypesList = async function (
  offset: number = 0,
  limit: number = 100,
  fields?: (keyof HttpTypes.StoreProductType)[]
): Promise<{ productTypes: HttpTypes.StoreProductType[]; count: number }> {
  const all = store.product_types as unknown as HttpTypes.StoreProductType[]
  const sliced = all.slice(offset, offset + limit)
  const productTypes =
    fields && fields.length
      ? sliced.map((t) => {
          const picked: Partial<HttpTypes.StoreProductType> = {}
          fields.forEach((f) => {
            picked[f] = t[f] as never
          })
          return picked as HttpTypes.StoreProductType
        })
      : sliced

  return { productTypes, count: all.length }
}

export const getProductTypeByHandle = async function (
  handle: string
): Promise<HttpTypes.StoreProductType> {
  const all = store.product_types as unknown as HttpTypes.StoreProductType[]
  const match =
    all.find((t) => t.value?.toLowerCase() === handle.toLowerCase()) ?? all[0]
  if (!match) {
    throw new Error(`Product type not found: ${handle}`)
  }
  return match
}
