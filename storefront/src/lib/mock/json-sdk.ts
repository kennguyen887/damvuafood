import store from "./store.json"

type FetchOptions = {
  method?: string
  query?: Record<string, unknown>
}

function createUnsupportedProxy(path: string): unknown {
  return new Proxy(() => {}, {
    get(_target, prop) {
      if (prop === "then") return undefined
      return createUnsupportedProxy(`${path}.${String(prop)}`)
    },
    apply() {
      throw new Error(`JSON data source: ${path} is not supported`)
    },
  })
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asStringArray(value: unknown): string[] | null {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value as string[]
  }
  const single = asString(value)
  return single ? [single] : null
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function createJsonSdk() {
  return {
    client: {
      fetch: async <T,>(path: string, options?: FetchOptions): Promise<T> => {
        const query = options?.query ?? {}

        if (path === "/store/regions") {
          return { regions: store.regions } as T
        }

        if (path.startsWith("/store/regions/")) {
          const id = path.split("/").pop()
          const region = store.regions.find((r) => r.id === id)
          if (!region) throw new Error(`Region not found: ${id}`)
          return { region } as T
        }

        if (path === "/store/custom/product-types") {
          const limit = asNumber(query.limit, 100)
          const offset = asNumber(query.offset, 0)
          const handle = asString(query.handle)
          const filtered = handle
            ? store.product_types.filter((t) => t.value.toLowerCase() === handle)
            : store.product_types
          const product_types = filtered.slice(offset, offset + limit)
          return { product_types, count: filtered.length } as T
        }

        if (path === "/store/collections") {
          const limit = asNumber(query.limit, 100)
          const offset = asNumber(query.offset, 0)
          const handle = asString(query.handle)
          const filtered = handle
            ? store.collections.filter((c) => c.handle === handle)
            : store.collections
          const collections = filtered.slice(offset, offset + limit)
          return { collections, count: filtered.length } as T
        }

        if (path.startsWith("/store/collections/")) {
          const id = path.split("/").pop()
          const collection = store.collections.find((c) => c.id === id)
          if (!collection) throw new Error(`Collection not found: ${id}`)
          return { collection } as T
        }

        if (path === "/store/product-categories") {
          return { product_categories: store.product_categories } as T
        }

        if (path === "/store/products") {
          const limit = asNumber(query.limit, 12)
          const offset = asNumber(query.offset, 0)
          const ids = asStringArray(query.id)
          const handles = asStringArray(query.handle)
          const collectionIds = asStringArray(query.collection_id)

          let filtered = store.products

          if (ids?.length) filtered = filtered.filter((p) => ids.includes(p.id))
          if (handles?.length)
            filtered = filtered.filter((p) => handles.includes(p.handle))
          if (collectionIds?.length)
            filtered = filtered.filter((p) =>
              collectionIds.includes(p.collection_id)
            )

          const products = filtered.slice(offset, offset + limit)
          return { products, count: filtered.length } as T
        }

        if (path.startsWith("/store/custom/fashion/")) {
          const handle = path.split("/").pop() ?? ""
          const entry =
            store.fashion[handle as keyof typeof store.fashion] ?? {
              materials: [],
            }
          return entry as T
        }

        if (path === "/store/customers/me") {
          return { customer: null } as T
        }

        if (path === "/store/orders") {
          const limit = asNumber(query.limit, 10)
          const offset = asNumber(query.offset, 0)
          const orders = store.orders.slice(offset, offset + limit)
          return { orders, count: store.orders.length } as T
        }

        if (path.startsWith("/store/orders/")) {
          const id = path.split("/").pop()
          const order = store.orders.find((o) => o.id === id)
          if (!order) throw new Error(`Order not found: ${id}`)
          return { order } as T
        }

        throw new Error(`JSON data source: unsupported endpoint ${path}`)
      },
    },
    store: createUnsupportedProxy("sdk.store"),
    auth: createUnsupportedProxy("sdk.auth"),
  }
}
