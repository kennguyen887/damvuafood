import Medusa from "@medusajs/js-sdk"
import { createJsonSdk } from "@lib/mock/json-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "json"

export const sdk =
  DATA_SOURCE === "json"
    ? (createJsonSdk() as unknown as Medusa)
    : new Medusa({
        baseUrl: MEDUSA_BACKEND_URL,
        debug: process.env.NODE_ENV === "development",
        publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      })
