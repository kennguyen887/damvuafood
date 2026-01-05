import { HttpTypes } from "@medusajs/types"
import { getRegion } from "@lib/data/regions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { sortProducts } from "@lib/util/sort-products"
import store from "@lib/mock/store.json"

export const listProductHandles = async function () {
  return (store.products as unknown as HttpTypes.StoreProduct[])
    .map((p) => p.handle)
    .filter(Boolean) as string[]
}

export const getProductsById = async function ({
  ids,
  regionId,
}: {
  ids: string[]
  regionId: string
}) {
  void regionId
  const all = store.products as unknown as HttpTypes.StoreProduct[]
  return all.filter((p) => ids.includes(p.id as string))
}

export const getProductByHandle = async function (
  handle: string,
  regionId: string
) {
  void regionId
  const all = store.products as unknown as HttpTypes.StoreProduct[]
  return all.find((p) => p.handle === handle) ?? null
}

export const getProductFashionDataByHandle = async function (handle: string) {
  const materials =
    (store.fashion as Record<string, { materials: unknown[] }>)[handle]
      ?.materials ?? []
  return { materials } as {
    materials: {
      id: string
      name: string
      colors: { id: string; name: string; hex_code: string }[]
    }[]
  }
}

export const getProductsList = async function ({
  pageParam = 1,
  queryParams,
  countryCode,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> {
  const page = Math.max(1, pageParam || 1)
  const limit = queryParams?.limit || 12
  const offset = (page - 1) * limit
  const region = await getRegion(countryCode)

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }
  let filtered = store.products as unknown as HttpTypes.StoreProduct[]

  const collectionIds = queryParams?.collection_id as unknown
  if (collectionIds) {
    const ids = Array.isArray(collectionIds) ? collectionIds : [collectionIds]
    filtered = filtered.filter((p) =>
      ids.includes((p.collection_id ?? "") as string)
    )
  }

  const productIds = queryParams?.id as unknown
  if (productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds]
    filtered = filtered.filter((p) => ids.includes(p.id as string))
  }

  const typeIds = queryParams?.type_id as unknown
  if (typeIds) {
    const ids = Array.isArray(typeIds) ? typeIds : [typeIds]
    filtered = filtered.filter((p) => ids.includes((p.type?.id ?? "") as string))
  }

  const count = filtered.length
  const products = filtered.slice(offset, offset + limit)
  const nextPage = count > offset + limit ? page + 1 : null

  return { response: { products, count }, nextPage, queryParams }
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const getProductsListWithSort = async function ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await getProductsList({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
