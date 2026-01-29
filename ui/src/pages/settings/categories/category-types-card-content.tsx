import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetCategoryTypes,
  useCreateCategoryType,
  useUpdateCategoryType,
  useDeleteCategoryType,
} from "@/hooks/api/use-user-category-api";
import { useAuthUserId } from "@/hooks/use-auth";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface CategoryTypesCardContentProps {
  isAdding: boolean;
  setIsAdding: (isAdding: boolean) => void;
}

export function CategoryTypesCardContent({
  isAdding,
  setIsAdding,
}: CategoryTypesCardContentProps) {
  const userId = useAuthUserId();
  const { data: allCategoryTypes } = useGetCategoryTypes(userId);

  // Filter to only show user-created category types
  const categoryTypes = useMemo(
    () => allCategoryTypes?.filter((type) => !type.is_global),
    [allCategoryTypes],
  );
  const createCategoryType = useCreateCategoryType(userId);
  const updateCategoryType = useUpdateCategoryType(userId);
  const deleteCategoryType = useDeleteCategoryType(userId);

  const [addingName, setAddingName] = useState("");
  const [editing, setEditing] = useState<{ id: number | null; name: string }>({
    id: null,
    name: "",
  });

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    await createCategoryType.mutateAsync({ name: addingName.trim() });
    setIsAdding(false);
    setAddingName("");
  };

  const handleUpdate = async () => {
    if (!editing.id || !editing.name.trim()) return;
    await updateCategoryType.mutateAsync({
      typeId: editing.id,
      data: { name: editing.name.trim() },
    });
    setEditing({ id: null, name: "" });
  };

  const handleDelete = (typeId: number) => {
    deleteCategoryType.mutate(typeId);
  };

  const startEditing = (id: number, name: string) => {
    setEditing({ id, name });
    setIsAdding(false);
    setAddingName("");
  };

  const cancelEditing = () => {
    setEditing({ id: null, name: "" });
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddingName("");
  };

  const isValid = (name: string) =>
    name.trim().length >= 1 && name.trim().length <= 50;

  return (
    <div className="space-y-2 max-h-[500px] overflow-auto">
      {isAdding && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
          <Input
            value={addingName}
            onChange={(e) => setAddingName(e.target.value)}
            placeholder="Type name..."
            className="h-8"
            maxLength={50}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid(addingName)) handleAdd();
              if (e.key === "Escape") cancelAdding();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleAdd}
            disabled={!isValid(addingName) || createCategoryType.isPending}
          >
            {createCategoryType.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={cancelAdding}
            disabled={createCategoryType.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {categoryTypes?.map((type) => (
        <div
          key={type.id}
          className="flex items-center justify-between p-2 rounded-md border"
        >
          {editing.id === type.id ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                className="h-8"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid(editing.name))
                    handleUpdate();
                  if (e.key === "Escape") cancelEditing();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUpdate}
                disabled={
                  !isValid(editing.name) || updateCategoryType.isPending
                }
              >
                {updateCategoryType.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={cancelEditing}
                disabled={updateCategoryType.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm">{type.name}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => startEditing(type.id, type.name)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(type.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {categoryTypes?.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No category types yet
        </p>
      )}
    </div>
  );
}
