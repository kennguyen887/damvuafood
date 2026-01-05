import { HttpTypes } from "@medusajs/types"

export const listCartPaymentMethods = async function (regionId: string) {
  void regionId
  return [
    {
      id: "pp_system_default",
      is_enabled: true,
    },
  ] as unknown as HttpTypes.StorePaymentProvider[]
}
