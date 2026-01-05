import { HttpTypes } from "@medusajs/types"
import store from "@lib/mock/store.json"

export const listCategories = async function () {
  return store.product_categories as unknown as HttpTypes.StoreProductCategory[]
}

export const getCategoriesList = async function (
  offset: number = 0,
  limit: number = 100,
  fields?: (keyof HttpTypes.StoreProductCategory)[]
) {
  const all =
    store.product_categories as unknown as HttpTypes.StoreProductCategory[]

  const sliced = all.slice(offset, offset + limit)
  const product_categories =
    fields && fields.length
      ? sliced.map((c) => {
          const picked: Partial<HttpTypes.StoreProductCategory> = {}
          fields.forEach((f) => {
            picked[f] = c[f] as never
          })
          return picked as HttpTypes.StoreProductCategory
        })
      : sliced

  return { product_categories }
}

export const getCategoryByHandle = async function (categoryHandle: string[]) {
  const all =
    store.product_categories as unknown as HttpTypes.StoreProductCategory[]
  const product_categories = all.filter((c) =>
    categoryHandle.includes((c.handle ?? "").toString())
  )
  return { product_categories } as HttpTypes.StoreProductCategoryListResponse
}
