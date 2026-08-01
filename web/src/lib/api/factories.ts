import type { AxiosInstance } from "axios"

import type { Configuration } from "@/api"

import { apiClient } from "./client"
import { API_BASE_URL } from "./config"

export type GeneratedApiFactory<T> = (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance
) => T

const bound = new WeakMap<GeneratedApiFactory<unknown>, unknown>()

export function api<T>(factory: GeneratedApiFactory<T>): T {
  const cached = bound.get(factory as GeneratedApiFactory<unknown>)
  if (cached !== undefined) return cached as T

  const instance = factory(undefined, API_BASE_URL, apiClient)
  bound.set(factory as GeneratedApiFactory<unknown>, instance)
  return instance
}
