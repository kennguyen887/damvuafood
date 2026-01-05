import { HttpTypes } from "@medusajs/types"

export const listCartShippingMethods = async function (cartId: string) {
  void cartId
  return [
    {
      id: "so_standard",
      name: "Standard Shipping",
      amount: 0,
    },
  ] as unknown as HttpTypes.StoreShippingOption[]
}
