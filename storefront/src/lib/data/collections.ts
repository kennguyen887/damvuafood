import { getProductsList } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import store from "@lib/mock/store.json"

export const retrieveCollection = async function (id: string) {
  const collection = (
    store.collections as unknown as HttpTypes.StoreCollection[]
  ).find((c) => c.id === id)
  if (!collection) {
    throw new Error(`Collection not found: ${id}`)
  }
  return collection
}

export const getCollectionsList = async function (
  offset: number = 0,
  limit: number = 100,
  fields?: (keyof HttpTypes.StoreCollection)[]
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> {
  const all = store.collections as unknown as HttpTypes.StoreCollection[]
  const sliced = all.slice(offset, offset + limit)
  const collections =
    fields && fields.length
      ? sliced.map((c) => {
          const picked: Partial<HttpTypes.StoreCollection> = {}
          fields.forEach((f) => {
            picked[f] = c[f] as never
          })
          return picked as HttpTypes.StoreCollection
        })
      : sliced

  return { collections, count: all.length }
}

export const getCollectionByHandle = async function (
  handle: string,
  fields?: (keyof HttpTypes.StoreCollection)[]
): Promise<HttpTypes.StoreCollection> {
  const all = store.collections as unknown as HttpTypes.StoreCollection[]
  const match = all.find((c) => c.handle === handle)
  if (!match) {
    throw new Error(`Collection not found: ${handle}`)
  }
  if (fields && fields.length) {
    const picked: Partial<HttpTypes.StoreCollection> = {}
    fields.forEach((f) => {
      picked[f] = match[f] as never
    })
    return picked as HttpTypes.StoreCollection
  }
  return match
}

export const getCollectionsWithProducts = async (
  countryCode: string
): Promise<HttpTypes.StoreCollection[] | null> => {
  const { collections } = await getCollectionsList(0, 3)

  if (!collections) {
    return null
  }

  const collectionIds = collections
    .map((collection) => collection.id)
    .filter(Boolean) as string[]

  const { response } = await getProductsList({
    queryParams: { collection_id: collectionIds },
    countryCode,
  })

  response.products.forEach((product) => {
    const collection = collections.find(
      (collection) => collection.id === product.collection_id
    )

    if (collection) {
      if (!collection.products) {
        collection.products = []
      }

      collection.products.push(product)
    }
  })

  return collections as unknown as HttpTypes.StoreCollection[]
}
