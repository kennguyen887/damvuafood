"use server"

import { z } from "zod"
import { HttpTypes } from "@medusajs/types"

import {
  loginFormSchema,
  signupFormSchema,
  updateCustomerFormSchema,
} from "hooks/customer"

type ActionState =
  | { state: "initial" }
  | { state: "success" }
  | { state: "error"; error: string }

export const getCustomer = async function () {
  return null as HttpTypes.StoreCustomer | null
}

export const updateCustomer = async function (
  formData: z.infer<typeof updateCustomerFormSchema>
): Promise<
  { state: "initial" | "success" } | { state: "error"; error: string }
> {
  void formData
  return {
    state: "error",
    error: "Customer API is not configured in local mode",
  }
}

export async function signup(formData: z.infer<typeof signupFormSchema>) {
  void formData
  return { success: false, error: "Auth is not configured in local mode" }
}

export async function login(formData: z.infer<typeof loginFormSchema>) {
  void formData
  return {
    success: false,
    message: "Auth is not configured in local mode",
  }
}

export async function signout(countryCode: string) {
  void countryCode
  return "ok"
}

export async function addCustomerAddress(
  _address: unknown
) {
  void _address
  return {
    addressId: "",
    success: false,
    error: "Customer API is not configured in local mode",
  }
}

export async function updateCustomerAddress(
  _addressId: unknown,
  _address: unknown
) {
  void _addressId
  void _address
  return {
    addressId: typeof _addressId === "string" ? _addressId : "",
    success: false,
    error: "Customer API is not configured in local mode",
  }
}

export async function deleteCustomerAddress(_addressId: unknown) {
  void _addressId
  return
}

export async function updateDefaultShippingAddress(_addressId: string) {
  void _addressId
  return
}

export async function updateDefaultBillingAddress(_addressId: string) {
  void _addressId
  return
}

export async function requestPasswordReset() {
  return { success: false, error: "Auth is not configured in local mode" }
}

export async function forgotPassword(
  _prevState: ActionState,
  _payload: { email: string }
): Promise<ActionState> {
  void _prevState
  void _payload
  return {
    state: "error",
    error: "Auth is not configured in local mode",
  }
}

export async function resetPassword(
  prevState: { email: string; token: string; state: "initial" | "success" | "error"; error?: string },
  _payload: unknown
): Promise<typeof prevState> {
  void _payload
  return {
    ...prevState,
    state: "error",
    error: "Auth is not configured in local mode",
  }
}
