"use server"

import { cache } from "react"
import { HttpTypes } from "@medusajs/types"
import store from "@lib/mock/store.json"
import { getLocalOrders } from "@lib/data/cookies"

type LocalOrder = HttpTypes.StoreOrder

export const retrieveOrder = cache(async function (id: unknown) {
  if (typeof id !== "string") {
    throw new Error("Invalid order id")
  }

  const localOrdersJson = await getLocalOrders()
  const localOrders: LocalOrder[] = localOrdersJson
    ? (JSON.parse(localOrdersJson) as LocalOrder[])
    : []

  const all = [
    ...(store.orders as unknown as LocalOrder[]),
    ...localOrders,
  ]

  return all.find((o) => o.id === id) ?? null
})

export const listOrders = async function (
  limit: number = 10,
  offset: number = 0
) {
  if (
    typeof limit !== "number" ||
    typeof offset !== "number" ||
    limit < 1 ||
    offset < 0 ||
    limit > 100 ||
    !Number.isSafeInteger(offset)
  ) {
    throw new Error("Invalid input data")
  }

  const localOrdersJson = await getLocalOrders()
  const localOrders: LocalOrder[] = localOrdersJson
    ? (JSON.parse(localOrdersJson) as LocalOrder[])
    : []

  const all = [...(store.orders as unknown as LocalOrder[]), ...localOrders]
  const orders = all.slice(offset, offset + limit)
  return { orders, count: all.length } as HttpTypes.StoreOrderListResponse
}
