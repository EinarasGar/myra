import { Suspense, useState } from "react";
import { useAuthUserId } from "@/hooks/use-auth";
import {
  useGetCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/api/use-user-category-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CategoryTypePicker from "@/components/category-type-picker";
import { type Category, type CategoryType } from "@/types/category";
import { Pencil, Trash2, User, Check, X, Loader2, CircleDashed } from "lucide-react";
import { DynamicIcon, IconName } from "lucide-react/dynamic";
import { IconPicker } from "@/components/ui/icon-picker";
import { DeleteCategoryDialog } from "./delete-category-dialog";

interface FormState {
  id: number | null;
  icon: string;
  name: string;
  categoryType: CategoryType | null;
}

const INITIAL_FORM_STATE: FormState = {
  id: null,
  icon: "",
  name: "",
  categoryType: null,
};

interface CategoriesCardContentProps {
  isAdding: boolean;
  setIsAdding: (isAdding: boolean) => void;
}

export function CategoriesCardContent({
  isAdding,
  setIsAdding,
}: CategoriesCardContentProps) {
  const userId = useAuthUserId();
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const [addingForm, setAddingForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [editing, setEditing] = useState<FormState>(INITIAL_FORM_STATE);

  const { data: categories } = useGetCategories(userId);
  const createCategory = useCreateCategory(userId);
  const updateCategory = useUpdateCategory(userId);

  const startEditing = (category: Category) => {
    setIsAdding(false);
    setAddingForm(INITIAL_FORM_STATE);
    setEditing({
      id: category.id,
      icon: category.icon,
      name: category.name,
      categoryType: {
        id: category.type.id,
        name: category.type.name,
        is_global: category.type.is_global,
      },
    });
  };

  const cancelEditing = () => {
    setEditing(INITIAL_FORM_STATE);
  };

  const handleUpdate = async () => {
    if (!editing.id || !editing.icon.trim() || !editing.name.trim() || !editing.categoryType) {
      return;
    }
    await updateCategory.mutateAsync({
      categoryId: editing.id,
      data: {
        category: editing.name.trim(),
        icon: editing.icon.trim(),
        category_type_id: editing.categoryType.id,
      },
    });
    cancelEditing();
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddingForm(INITIAL_FORM_STATE);
  };

  const handleAdd = async () => {
    if (!addingForm.icon.trim() || !addingForm.name.trim() || !addingForm.categoryType) {
      return;
    }
    await createCategory.mutateAsync({
      category: addingForm.name.trim(),
      icon: addingForm.icon.trim(),
      category_type_id: addingForm.categoryType.id,
    });
    cancelAdding();
  };

  const isAddValid =
    addingForm.icon.trim() !== "" &&
    addingForm.name.trim() !== "" &&
    addingForm.categoryType !== null;

  const isEditValid =
    editing.icon.trim() !== "" &&
    editing.name.trim() !== "" &&
    editing.categoryType !== null;

  return (
    <>
      <div className="space-y-2 max-h-[500px] overflow-auto">
        {/* Add new category row */}
        {isAdding && (
          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
            <IconPicker
              value={addingForm.icon?.replace(/_/g, "-") as IconName || undefined}
              onValueChange={(icon) =>
                setAddingForm((prev) => ({ ...prev, icon: icon.replace(/-/g, "_") }))
              }
              modal={true}
            >
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                {addingForm.icon ? (
                  <DynamicIcon
                    name={addingForm.icon.replace(/_/g, "-") as IconName}
                    className="h-4 w-4"
                  />
                ) : (
                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </IconPicker>

            <Input
              value={addingForm.name}
              onChange={(e) =>
                setAddingForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Category name..."
              className="h-8 flex-1"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isAddValid) handleAdd();
                if (e.key === "Escape") cancelAdding();
              }}
            />

            <Suspense fallback={<div className="h-8 w-36 shrink-0 animate-pulse bg-muted rounded" />}>
              <CategoryTypePicker
                value={addingForm.categoryType}
                onChange={(type) =>
                  setAddingForm((prev) => ({ ...prev, categoryType: type }))
                }
                className="h-8 w-36 shrink-0"
              />
            </Suspense>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAdd}
              disabled={!isAddValid || createCategory.isPending}
            >
              {createCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={cancelAdding}
              disabled={createCategory.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Category list */}
        {categories?.map((category) => {
          const isEditing = editing.id === category.id;
          const isEditable = !category.isGlobal && !category.isSystem;
          const iconName = (category.icon as string)?.replace(/_/g, "-") as IconName;

          return (
            <div
              key={category.id}
              className="flex items-center gap-2 p-2 rounded-md border"
            >
              {isEditing ? (
                // Edit mode
                <>
                  <IconPicker
                    value={editing.icon?.replace(/_/g, "-") as IconName || undefined}
                    onValueChange={(icon) =>
                      setEditing((prev) => ({ ...prev, icon: icon.replace(/-/g, "_") }))
                    }
                    modal={true}
                  >
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                      {editing.icon ? (
                        <DynamicIcon
                          name={editing.icon.replace(/_/g, "-") as IconName}
                          className="h-4 w-4"
                        />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </IconPicker>

                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="h-8 flex-1"
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isEditValid) handleUpdate();
                      if (e.key === "Escape") cancelEditing();
                    }}
                  />

                  <Suspense fallback={<div className="h-8 w-36 shrink-0 animate-pulse bg-muted rounded" />}>
                    <CategoryTypePicker
                      value={editing.categoryType}
                      onChange={(type) =>
                        setEditing((prev) => ({ ...prev, categoryType: type }))
                      }
                      className="h-8 w-36 shrink-0"
                    />
                  </Suspense>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleUpdate}
                    disabled={!isEditValid || updateCategory.isPending}
                  >
                    {updateCategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={cancelEditing}
                    disabled={updateCategory.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                // View mode
                <>
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {iconName && <DynamicIcon name={iconName} className="h-5 w-5" />}
                  </div>

                  <span className="text-sm flex-1">{category.name}</span>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                    <span>{category.type.name}</span>
                    {!category.type.is_global && (
                      <User className="h-3 w-3" />
                    )}
                  </div>

                  {isEditable ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">Read-only</span>
                  )}
                </>
              )}
            </div>
          );
        })}

        {categories?.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet
          </p>
        )}
      </div>

      <DeleteCategoryDialog
        category={deleteCategory}
        open={deleteCategory !== null}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
      />
    </>
  );
}
