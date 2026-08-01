import { z } from "zod"

import { boundedName } from "@/lib/validation"

import type { CreateCategoryRequest, CreateCategoryTypeRequest } from "@/api"

export const CATEGORY_NAME_MAX_LENGTH = 100
export const CATEGORY_ICON_MAX_LENGTH = 50
export const CATEGORY_TYPE_NAME_MAX_LENGTH = 50

export const MAX_CUSTOM_CATEGORIES = 100
export const MAX_CUSTOM_CATEGORY_TYPES = 20

export const categoryFormSchema = z.object({
  category: boundedName(CATEGORY_NAME_MAX_LENGTH),
  icon: boundedName(CATEGORY_ICON_MAX_LENGTH),
  category_type_id: z.int().positive("Select a category type."),
}) satisfies z.ZodType<CreateCategoryRequest>

export const categoryTypeFormSchema = z.object({
  name: boundedName(CATEGORY_TYPE_NAME_MAX_LENGTH),
}) satisfies z.ZodType<CreateCategoryTypeRequest>

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
export type CategoryTypeFormValues = z.infer<typeof categoryTypeFormSchema>
