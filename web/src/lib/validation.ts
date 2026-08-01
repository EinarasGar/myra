import { z } from "zod"

function lengthMessage(max: number): string {
  return `Must be between 1 and ${max} characters.`
}

export function boundedName(max: number) {
  return z
    .string()
    .trim()
    .min(1, lengthMessage(max))
    .max(max, lengthMessage(max))
}
