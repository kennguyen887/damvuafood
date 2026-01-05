import "server-only"
import { cookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  { authorization: string } | {}
> => {
  const token = (await cookies()).get("_medusa_jwt")?.value

  if (token) {
    return { authorization: `Bearer ${token}` }
  }

  return {}
}

export const setAuthToken = async (token: string) => {
  return (await cookies()).set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  return (await cookies()).set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  return (await cookies()).get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  return (await cookies()).set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  return (await cookies()).set("_medusa_cart_id", "", { maxAge: -1 })
}

const LOCAL_CART_COOKIE = "_local_cart"

export const getLocalCart = async () => {
  return (await cookies()).get(LOCAL_CART_COOKIE)?.value
}

export const setLocalCart = async (value: string) => {
  return (await cookies()).set(LOCAL_CART_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeLocalCart = async () => {
  return (await cookies()).set(LOCAL_CART_COOKIE, "", { maxAge: -1 })
}

const LOCAL_ORDERS_COOKIE = "_local_orders"

export const getLocalOrders = async () => {
  return (await cookies()).get(LOCAL_ORDERS_COOKIE)?.value
}

export const setLocalOrders = async (value: string) => {
  return (await cookies()).set(LOCAL_ORDERS_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}
