"use server"

import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { PaymentMethod } from "@stripe/stripe-js"

import store from "@lib/mock/store.json"
import { getRegion } from "@lib/data/regions"
import {
  getCartId,
  getLocalCart,
  getLocalOrders,
  removeCartId,
  removeLocalCart,
  setCartId,
  setLocalCart,
  setLocalOrders,
} from "@lib/data/cookies"
import { addressesFormSchema } from "hooks/cart"

type LocalCartItem = {
  id: string
  variant_id: string
  quantity: number
  created_at: string
}

type LocalCartState = {
  id: string
  region_id?: string
  email?: string
  shipping_address?: unknown
  billing_address?: unknown
  shipping_methods?: { shipping_option_id: string }[]
  payment_collection?: {
    id: string
    payment_sessions: {
      id: string
      provider_id: string
      status: "pending" | "requires_more" | "authorized" | "captured" | "canceled"
      data?: Record<string, unknown>
    }[]
  }
  promotions?: { code?: string }[]
  items: LocalCartItem[]
}

function safeJsonParse<T>(value: string | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

function findProductAndVariant(variantId: string) {
  for (const product of store.products) {
    const variant = product.variants?.find((v) => v.id === variantId)
    if (variant) {
      return { product, variant }
    }
  }
  return null
}

function variantUnitAmount(variant: unknown) {
  const v = variant as {
    calculated_price?: { calculated_amount?: number | null } | null
  }
  return v?.calculated_price?.calculated_amount ?? 0
}

async function getExistingLocalCart() {
  const cart = safeJsonParse<LocalCartState>(await getLocalCart())
  if (!cart) {
    throw new Error("No existing cart found")
  }
  return cart
}

async function getOrCreateLocalCart(countryCode: string) {
  const existing = safeJsonParse<LocalCartState>(await getLocalCart())
  if (existing?.id && Array.isArray(existing.items)) return existing

  const region = await getRegion(countryCode)
  const cart: LocalCartState = {
    id: createId("cart"),
    region_id: region?.id,
    email: undefined,
    shipping_address: undefined,
    billing_address: undefined,
    shipping_methods: [],
    payment_collection: undefined,
    promotions: [],
    items: [],
  }

  await setCartId(cart.id)
  await setLocalCart(JSON.stringify(cart))
  return cart
}

async function saveLocalCart(cart: LocalCartState) {
  await setLocalCart(JSON.stringify(cart))
  revalidateTag("cart")
}

function toStoreCart(cart: LocalCartState): HttpTypes.StoreCart {
  const region = (store.regions as { id: string }[]).find(
    (r) => r.id === cart.region_id
  )

  const currency_code = (() => {
    const maybe = region as unknown as { currency_code?: unknown } | undefined
    return (
      (typeof maybe?.currency_code === "string" ? maybe.currency_code : null) ??
      store.regions[0]?.currency_code ??
      "vnd"
    )
  })()

  const items = cart.items
    .map((i) => {
      const found = findProductAndVariant(i.variant_id)
      if (!found) return null
      const { product, variant } = found

      return {
        id: i.id,
        created_at: i.created_at,
        quantity: i.quantity,
        variant_id: i.variant_id,
        product_id: product.id,
        product_title: product.title,
        variant: {
          ...variant,
          product: product,
        },
      } as unknown as HttpTypes.StoreCartLineItem
    })
    .filter(Boolean) as unknown as HttpTypes.StoreCartLineItem[]

  const subtotal = items.reduce((sum, item) => {
    return sum + variantUnitAmount(item.variant) * (item.quantity ?? 0)
  }, 0)

  const shipping_total = 0
  const tax_total = 0
  const discount_total = 0
  const gift_card_total = 0
  const total =
    subtotal + shipping_total + tax_total - discount_total - gift_card_total

  return {
    id: cart.id,
    region_id: cart.region_id,
    region: region as unknown as HttpTypes.StoreRegion,
    currency_code,
    items,
    promotions: cart.promotions ?? [],
    email: cart.email,
    shipping_address:
      cart.shipping_address as unknown as HttpTypes.StoreCart["shipping_address"],
    billing_address:
      cart.billing_address as unknown as HttpTypes.StoreCart["billing_address"],
    shipping_methods:
      (cart.shipping_methods ?? []) as unknown as HttpTypes.StoreCart["shipping_methods"],
    payment_collection:
      cart.payment_collection as unknown as HttpTypes.StoreCart["payment_collection"],
    subtotal,
    total,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
  } as unknown as HttpTypes.StoreCart
}

export async function retrieveCart() {
  const cart = safeJsonParse<LocalCartState>(await getLocalCart())
  if (!cart) return null
  return toStoreCart(cart)
}

export async function getCartQuantity() {
  const cart = await retrieveCart()
  if (!cart?.items?.length) return 0
  return cart.items.reduce((acc, item) => acc + item.quantity, 0)
}

export async function getOrSetCart(input: unknown) {
  if (typeof input !== "string") {
    throw new Error("Invalid input when retrieving cart")
  }

  const cart = await getOrCreateLocalCart(input)
  return toStoreCart(cart)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: unknown
  quantity: unknown
  countryCode: unknown
}) {
  if (typeof variantId !== "string") {
    throw new Error("Missing variant ID when adding to cart")
  }

  if (
    typeof quantity !== "number" ||
    quantity < 1 ||
    !Number.isSafeInteger(quantity)
  ) {
    throw new Error("Missing quantity when adding to cart")
  }

  if (typeof countryCode !== "string") {
    throw new Error("Missing country code when adding to cart")
  }

  const found = findProductAndVariant(variantId)
  if (!found) {
    throw new Error("Variant not found")
  }

  const cart = await getOrCreateLocalCart(countryCode)

  const existing = cart.items.find((i) => i.variant_id === variantId)
  const max =
    found.variant.manage_inventory === false || found.variant.allow_backorder
      ? Number.MAX_SAFE_INTEGER
      : found.variant.inventory_quantity ?? 0

  const nextQty = (existing?.quantity ?? 0) + quantity
  if (nextQty > max) {
    throw new Error("Not enough inventory")
  }

  if (existing) {
    existing.quantity = nextQty
  } else {
    cart.items.push({
      id: createId("li"),
      variant_id: variantId,
      quantity,
      created_at: new Date().toISOString(),
    })
  }

  await saveLocalCart(cart)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: unknown
  quantity: unknown
}) {
  if (typeof lineId !== "string") {
    throw new Error("Missing lineItem ID when updating line item")
  }

  if (
    typeof quantity !== "number" ||
    quantity < 1 ||
    !Number.isSafeInteger(quantity)
  ) {
    throw new Error("Missing quantity when updating line item")
  }

  const cart = await getExistingLocalCart()
  const item = cart.items.find((i) => i.id === lineId)
  if (!item) throw new Error("Line item not found")

  const found = findProductAndVariant(item.variant_id)
  if (!found) throw new Error("Variant not found")

  const max =
    found.variant.manage_inventory === false || found.variant.allow_backorder
      ? Number.MAX_SAFE_INTEGER
      : found.variant.inventory_quantity ?? 0

  if (quantity > max) {
    throw new Error("Not enough inventory")
  }

  item.quantity = quantity
  await saveLocalCart(cart)
}

export async function deleteLineItem(lineId: unknown) {
  if (typeof lineId !== "string") {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cart = safeJsonParse<LocalCartState>(await getLocalCart())
  if (!cart) return
  cart.items = cart.items.filter((i) => i.id !== lineId)
  await saveLocalCart(cart)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: unknown
  shippingMethodId: unknown
}) {
  if (typeof cartId !== "string") {
    throw new Error("Missing cart ID when setting shipping method")
  }

  if (typeof shippingMethodId !== "string") {
    throw new Error("Missing shipping method ID when setting shipping method")
  }

  const cart = await getExistingLocalCart()
  if (cart.id !== cartId) {
    throw new Error("Cart mismatch")
  }

  cart.shipping_methods = [{ shipping_option_id: shippingMethodId }]
  await saveLocalCart(cart)
}

export async function setPaymentMethod(
  session_id: string,
  token: string | null | undefined
) {
  void session_id
  void token
  return
}

export async function getPaymentMethod(id: string) {
  void id
  return null as PaymentMethod | null
}

export async function initiatePaymentSession(provider_id: unknown) {
  const cart = await getExistingLocalCart()

  if (typeof provider_id !== "string") {
    throw new Error("Invalid payment provider")
  }

  cart.payment_collection = {
    id: createId("paycol"),
    payment_sessions: [
      {
        id: createId("paysess"),
        provider_id,
        status: "pending",
        data: {},
      },
    ],
  }

  await saveLocalCart(cart)
  return {
    payment_collection: cart.payment_collection,
  } as unknown as HttpTypes.StorePaymentCollectionResponse
}

export async function applyPromotions(codes: string[]) {
  const cart = await getExistingLocalCart()
  cart.promotions = codes.map((c) => ({ code: c }))
  await saveLocalCart(cart)
}

export async function setEmail({
  email,
  country_code,
}: {
  email: string
  country_code: string
}) {
  const countryCode = z.string().min(2).safeParse(country_code)
  if (!countryCode.success) {
    return { success: false, error: "Invalid country code" }
  }

  const cart = safeJsonParse<LocalCartState>(await getLocalCart())
  if (!cart) {
    return { success: false, error: "No existing cart found" }
  }

  cart.email = email
  await saveLocalCart(cart)

  return { success: true, error: null }
}

export async function setAddresses(
  formData: z.infer<typeof addressesFormSchema>
) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cart = safeJsonParse<LocalCartState>(await getLocalCart())
    if (!cart) {
      throw new Error("No existing cart found when setting addresses")
    }

    cart.shipping_address = formData.shipping_address
    cart.billing_address =
      formData.same_as_billing === "on"
        ? formData.shipping_address
        : formData.billing_address

    await saveLocalCart(cart)
    revalidateTag("shipping")
    return { success: true, error: null }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not set addresses",
    }
  }
}

export async function placeOrder() {
  const cart = await getExistingLocalCart()
  const storeCart = toStoreCart(cart)

  const localOrdersJson = await getLocalOrders()
  const localOrders: unknown = localOrdersJson ? JSON.parse(localOrdersJson) : []

  const existingDisplayIds = [
    ...(store.orders as { display_id?: number }[]).map((o) => o.display_id),
    ...(Array.isArray(localOrders) ? localOrders : [])
      .map((o) => {
        if (!o || typeof o !== "object") return null
        const maybe = (o as Record<string, unknown>).display_id
        return typeof maybe === "number" ? maybe : null
      })
      .filter((x): x is number => typeof x === "number"),
  ].filter((x): x is number => typeof x === "number")

  const nextDisplayId =
    (existingDisplayIds.length ? Math.max(...existingDisplayIds) : 1000) + 1

  const createdAt = new Date().toISOString()
  const orderId = createId("order")

  const orderItems = (storeCart.items ?? []).map((item) => {
    return {
      id: createId("order_item"),
      created_at: createdAt,
      quantity: item.quantity,
      product_title: item.product_title,
      product_handle: item.variant?.product?.handle,
      variant: item.variant,
    }
  })

  const order = {
    id: orderId,
    display_id: nextDisplayId,
    created_at: createdAt,
    currency_code: storeCart.currency_code,
    subtotal: storeCart.subtotal,
    total: storeCart.total,
    tax_total: storeCart.tax_total,
    shipping_total: storeCart.shipping_total,
    discount_total: storeCart.discount_total,
    gift_card_total: storeCart.gift_card_total,
    items: orderItems,
    shipping_address: {
      ...(storeCart.shipping_address ?? {}),
      country: { display_name: "Vietnam" },
    },
    billing_address: {
      ...(storeCart.billing_address ?? {}),
      country: { display_name: "Vietnam" },
    },
    shipping_methods: storeCart.shipping_methods ?? [],
    region_id: storeCart.region_id,
  } as unknown as HttpTypes.StoreOrder

  const nextOrders = Array.isArray(localOrders)
    ? [...localOrders, order]
    : [order]
  await setLocalOrders(JSON.stringify(nextOrders))

  await removeCartId()
  await removeLocalCart()
  revalidateTag("cart")
  revalidateTag("orders")

  return { type: "order", order } as {
    type: "order"
    order: HttpTypes.StoreOrder
  }
}

export async function updateRegion(countryCode: string, currentPath: string) {
  if (typeof countryCode !== "string") {
    throw new Error("Invalid country code")
  }

  if (typeof currentPath !== "string") {
    throw new Error("Invalid current path")
  }

  const existingCartId = await getCartId()
  void existingCartId

  const region = await getRegion(countryCode)
  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  const cart = safeJsonParse<LocalCartState>(await getLocalCart())
  if (cart) {
    cart.region_id = region.id
    await saveLocalCart(cart)
  }

  revalidateTag("regions")
  revalidateTag("products")

  redirect(`/${countryCode}${currentPath}`)
}
