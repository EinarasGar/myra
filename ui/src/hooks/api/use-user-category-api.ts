import {
  UserCategoriesApiFactory,
  CreateCategoryRequestViewModel,
  CreateCategoryTypeRequestViewModel,
  UpdateCategoryRequestViewModel,
  UpdateCategoryTypeRequestViewModel,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import {
  useMutation,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Category, CategoryType } from "@/types/category";

export function useGetCategories(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_CATEGORIES, userId],
    queryFn: async () => {
      const response = await UserCategoriesApiFactory().getCategories(userId);
      const { categories: rawCategories, lookup_tables } = response.data;

      const categories: Category[] = rawCategories.map((cat) => {
        const categoryType = lookup_tables.category_types.find(
          (t) => t.id === cat.category_type,
        );
        return {
          id: cat.id,
          name: cat.category,
          icon: cat.icon,
          isSystem: cat.is_system,
          isGlobal: cat.is_global,
          type: {
            id: cat.category_type,
            name: categoryType?.name || "",
            is_global: categoryType?.is_global ?? true,
          },
        };
      });

      return categories;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCategory(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryRequestViewModel) =>
      UserCategoriesApiFactory().postUserCategory(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.USER_CATEGORIES, userId],
      });
    },
  });
}

export function useUpdateCategory(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_CATEGORIES, userId];
  const mutationKey = ["mutate-categories", userId];

  return useMutation({
    mutationKey,
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: number;
      data: UpdateCategoryRequestViewModel;
    }) => UserCategoriesApiFactory().putUserCategory(userId, categoryId, data),
    onMutate: async ({ categoryId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Category[]>(queryKey);
      queryClient.setQueryData<Category[]>(queryKey, (old) =>
        old?.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                name: data.category ?? cat.name,
                icon: data.icon ?? cat.icon,
                type: data.category_type_id
                  ? {
                      ...cat.type,
                      id: data.category_type_id,
                    }
                  : cat.type,
              }
            : cat,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useDeleteCategory(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_CATEGORIES, userId];
  const mutationKey = ["mutate-categories", userId];

  return useMutation({
    mutationKey,
    mutationFn: (categoryId: number) =>
      UserCategoriesApiFactory().deleteUserCategory(userId, categoryId),
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Category[]>(queryKey);
      queryClient.setQueryData<Category[]>(queryKey, (old) =>
        old?.filter((cat) => cat.id !== categoryId),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useGetCategoryTypes(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_CATEGORY_TYPES, userId],
    queryFn: async () => {
      const response =
        await UserCategoriesApiFactory().getUserCategoryTypes(userId);
      return response.data.category_types;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCategoryType(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryTypeRequestViewModel) =>
      UserCategoriesApiFactory().postUserCategoryType(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.USER_CATEGORY_TYPES, userId],
      });
    },
  });
}

export function useUpdateCategoryType(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_CATEGORY_TYPES, userId];
  const mutationKey = ["mutate-category-types", userId];

  return useMutation({
    mutationKey,
    mutationFn: ({
      typeId,
      data,
    }: {
      typeId: number;
      data: UpdateCategoryTypeRequestViewModel;
    }) => UserCategoriesApiFactory().putUserCategoryType(userId, typeId, data),
    onMutate: async ({ typeId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CategoryType[]>(queryKey);
      queryClient.setQueryData<CategoryType[]>(queryKey, (old) =>
        old?.map((t) =>
          t.id === typeId ? { ...t, name: data.name ?? t.name } : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useDeleteCategoryType(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_CATEGORY_TYPES, userId];
  const mutationKey = ["mutate-category-types", userId];

  return useMutation({
    mutationKey,
    mutationFn: (typeId: number) =>
      UserCategoriesApiFactory().deleteUserCategoryType(userId, typeId),
    onMutate: async (typeId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CategoryType[]>(queryKey);
      queryClient.setQueryData<CategoryType[]>(queryKey, (old) =>
        old?.filter((t) => t.id !== typeId),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
