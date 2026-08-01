import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { CreateCategoryRequest, CreateCategoryTypeRequest } from "@/api"
import { UserCategoriesApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { Category } from "@/lib/domain/refs"
import type { CategoryId, CategoryTypeId, UserId } from "@/lib/query"
import {
  mutationKeys,
  optimisticMutationOptions,
  optimisticUpdate,
  queryKeys,
} from "@/lib/query"

import type { CategoryType } from "./types"
import { PENDING_CATEGORY_ID } from "./types"

export interface CreateCategoryVariables {
  body: CreateCategoryRequest
}

export interface UpdateCategoryVariables {
  categoryId: CategoryId
  body: CreateCategoryRequest
}

export interface DeleteCategoryVariables {
  categoryId: CategoryId
}

export interface CreateCategoryTypeVariables {
  body: CreateCategoryTypeRequest
}

export interface UpdateCategoryTypeVariables {
  typeId: CategoryTypeId
  body: CreateCategoryTypeRequest
}

export interface DeleteCategoryTypeVariables {
  typeId: CategoryTypeId
}

function categoriesKey(userId: UserId) {
  return queryKeys.user(userId).categories.all()
}

function typesKey(userId: UserId) {
  return queryKeys.user(userId).categories.types()
}

export function useCreateCategory(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<Category, CreateCategoryVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categories(),
      mutationFn: async ({ body }) => {
        const response = await api(UserCategoriesApiFactory).postUserCategory(
          userId,
          body
        )
        const { data } = response
        return {
          id: data.id,
          name: data.category,
          icon: data.icon,
          typeId: data.category_type.id,
          isGlobal: data.is_global,
          isSystem: data.is_system,
        }
      },
      updates: [
        optimisticUpdate<Category[], CreateCategoryVariables>(
          categoriesKey(userId),
          (previous, { body }) =>
            previous === undefined
              ? previous
              : [
                  ...previous,
                  {
                    id: PENDING_CATEGORY_ID,
                    name: body.category,
                    icon: body.icon,
                    typeId: body.category_type_id,
                    isGlobal: false,
                    isSystem: false,
                  },
                ]
        ),
      ],
      meta: { errorContext: "The category could not be created" },
    })
  )
}

export function useUpdateCategory(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, UpdateCategoryVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categories(),
      mutationFn: async ({ categoryId, body }) => {
        await api(UserCategoriesApiFactory).putUserCategory(
          userId,
          categoryId,
          body
        )
      },
      updates: [
        optimisticUpdate<Category[], UpdateCategoryVariables>(
          categoriesKey(userId),
          (previous, { categoryId, body }) =>
            previous?.map((category) =>
              category.id === categoryId
                ? {
                    ...category,
                    name: body.category,
                    icon: body.icon,
                    typeId: body.category_type_id,
                  }
                : category
            )
        ),
      ],
      meta: { errorContext: "The category could not be saved" },
    })
  )
}

export function useDeleteCategory(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteCategoryVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categories(),
      mutationFn: async ({ categoryId }) => {
        await api(UserCategoriesApiFactory).deleteUserCategory(
          userId,
          categoryId
        )
      },
      updates: [
        optimisticUpdate<Category[], DeleteCategoryVariables>(
          categoriesKey(userId),
          (previous, { categoryId }) =>
            previous?.filter((category) => category.id !== categoryId)
        ),
      ],
      meta: { errorContext: "The category could not be deleted" },
    })
  )
}

export function useCreateCategoryType(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<CategoryType, CreateCategoryTypeVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categoryTypes(),
      mutationFn: async ({ body }) => {
        const response = await api(
          UserCategoriesApiFactory
        ).postUserCategoryType(userId, body)
        return {
          id: response.data.id,
          name: response.data.name,
          isGlobal: response.data.is_global,
        }
      },
      updates: [
        optimisticUpdate<CategoryType[], CreateCategoryTypeVariables>(
          typesKey(userId),
          (previous, { body }) =>
            previous === undefined
              ? previous
              : [
                  ...previous,
                  {
                    id: PENDING_CATEGORY_ID,
                    name: body.name,
                    isGlobal: false,
                  },
                ]
        ),
      ],
      meta: { errorContext: "The category type could not be created" },
    })
  )
}

export function useUpdateCategoryType(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, UpdateCategoryTypeVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categoryTypes(),
      mutationFn: async ({ typeId, body }) => {
        await api(UserCategoriesApiFactory).putUserCategoryType(
          userId,
          typeId,
          body
        )
      },
      updates: [
        optimisticUpdate<CategoryType[], UpdateCategoryTypeVariables>(
          typesKey(userId),
          (previous, { typeId, body }) =>
            previous?.map((type) =>
              type.id === typeId ? { ...type, name: body.name } : type
            )
        ),
      ],
      meta: { errorContext: "The category type could not be saved" },
    })
  )
}

export function useDeleteCategoryType(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteCategoryTypeVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).categoryTypes(),
      mutationFn: async ({ typeId }) => {
        await api(UserCategoriesApiFactory).deleteUserCategoryType(
          userId,
          typeId
        )
      },
      updates: [
        optimisticUpdate<CategoryType[], DeleteCategoryTypeVariables>(
          typesKey(userId),
          (previous, { typeId }) =>
            previous?.filter((type) => type.id !== typeId)
        ),
      ],
      invalidate: [queryKeys.user(userId).categories.all()],
      meta: { errorContext: "The category type could not be deleted" },
    })
  )
}
