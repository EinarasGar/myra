import { useState } from "react"
import { Plus } from "lucide-react"

import { useUserId } from "@/auth"
import { countOf } from "@/lib/format"
import type { Category } from "@/lib/domain/refs"
import { cn } from "@/lib/utils"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import {
  focusRing,
  FoldRow,
  HIT_TARGET,
  MetaChip,
  Panel,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import type { CategoryType, CategoryTypeGroup } from "@/features/categories/api"
import {
  isEditableCategory,
  isEditableCategoryType,
  useCategoryCatalogue,
  useDeleteCategory,
  useDeleteCategoryType,
} from "@/features/categories/api"

import { SettingsBlock, SettingsBlocks } from "./blocks"
import { CategoryDialog, CategoryTypeDialog } from "./category-dialogs"
import { CategoryIcon } from "./category-icon"
import { ConfirmDestructive } from "./confirm-dialog"
import {
  CATEGORY_COUNT_SCOPE,
  CATEGORY_DELETE_CONSEQUENCE,
  CATEGORY_GLOBAL_NOTE,
  CATEGORY_TYPE_DELETE_CONSEQUENCE,
} from "./copy"
import { CustomAssetsBlock } from "./custom-assets"
import { SettingsGroupsSkeleton } from "./skeletons"

export const TYPE_GROUPS_DRAWN = 4

const TYPE_SWATCHES = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
  "bg-chart-7",
  "bg-chart-8",
] as const

const TYPE_INKS = [
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
  "text-chart-6",
  "text-chart-7",
  "text-chart-8",
] as const

function swatchAt(index: number): string {
  return TYPE_SWATCHES[index % TYPE_SWATCHES.length] ?? "bg-chart-1"
}

function inkAt(index: number): string {
  return TYPE_INKS[index % TYPE_INKS.length] ?? "text-chart-1"
}

function categoryCountLabel(count: number): string {
  return `${count} categor${count === 1 ? "y" : "ies"}`
}

function CategoryChip({
  category,
  ink,
  onEdit,
  onDelete,
}: {
  category: Category
  ink: string
  onEdit: () => void
  onDelete: () => void
}) {
  const editable = isEditableCategory(category)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] rounded-sm border border-border-strong px-[10px] py-[7px]",
        editable && "bg-brand-dim"
      )}
    >
      <span className={ink}>
        <CategoryIcon name={category.icon} />
      </span>
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "text-[11.5px] leading-none font-medium whitespace-nowrap outline-none",
            focusRing.chip
          )}
        >
          {category.name}
        </button>
      ) : (
        <span className="text-[11.5px] leading-none font-medium whitespace-nowrap">
          {category.name}
        </span>
      )}
      {editable ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${category.name}`}
          className={cn(
            "text-[11px] leading-none text-ink-3 outline-none hover:text-negative",
            HIT_TARGET,
            focusRing.chip
          )}
        >
          ×
        </button>
      ) : null}
    </span>
  )
}

function TypeGroup({
  group,
  index,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onRenameType,
  onDeleteType,
}: {
  group: CategoryTypeGroup
  index: number
  onAddCategory: (typeId: number) => void
  onEditCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
  onRenameType: (type: CategoryType) => void
  onDeleteType: (type: CategoryType) => void
}) {
  const editable = isEditableCategoryType(group.type)
  const ink = inkAt(index)

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-[10px] border-b border-border px-4 py-3">
        <span
          aria-hidden
          className={cn("size-[7px] flex-none rounded-chip", swatchAt(index))}
        />
        <span className="text-[12.5px] leading-none font-semibold">
          {group.type.name === "" ? "Unnamed type" : group.type.name}
        </span>
        <span className="text-[11px] leading-none text-ink-3">
          {categoryCountLabel(group.categoryCount)}
        </span>
        <span className="flex-1" />
        {editable ? <MetaChip tone="brand">Yours</MetaChip> : null}
        {editable ? (
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                onRenameType(group.type)
              }}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-negative hover:text-negative"
              onClick={() => {
                onDeleteType(group.type)
              }}
            >
              Delete
            </Button>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 px-4 pt-[14px] pb-[15px]">
        {group.categories.map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            ink={ink}
            onEdit={() => {
              onEditCategory(category)
            }}
            onDelete={() => {
              onDeleteCategory(category)
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            onAddCategory(group.type.id)
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-[10px] py-[7px] text-[11.5px] leading-none font-semibold whitespace-nowrap text-brand outline-none hover:bg-surface-2",
            focusRing.sm
          )}
        >
          <Plus aria-hidden className="size-3" />
          Add
        </button>
      </div>
    </Panel>
  )
}

function CategoryTypesBlock() {
  const userId = useUserId()
  const catalogue = useCategoryCatalogue(userId)
  const deleteCategory = useDeleteCategory(userId)
  const deleteType = useDeleteCategoryType(userId)

  const [expanded, setExpanded] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState<{
    category: Category | null
    typeId: number | null
  } | null>(null)
  const [typeDialog, setTypeDialog] = useState<{
    type: CategoryType | null
  } | null>(null)
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null)
  const [pendingType, setPendingType] = useState<CategoryType | null>(null)

  const shown = expanded
    ? catalogue.groups.length
    : Math.min(TYPE_GROUPS_DRAWN, catalogue.groups.length)
  const visible = catalogue.groups.slice(0, shown)
  const foldedNames = catalogue.groups
    .slice(shown)
    .map((group) => group.type.name)
    .join(" · ")

  return (
    <SettingsBlock
      title="Category types"
      note={`${countOf(catalogue.totalTypes, "type")} · ${countOf(catalogue.totalCategories, "category", "categories")}`}
      action={
        <Button
          variant="ghost"
          size="xs"
          className="text-brand hover:text-brand"
          onClick={() => {
            setTypeDialog({ type: null })
          }}
        >
          <Plus aria-hidden className="size-3" />
          New type
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {visible.map((group, index) => (
          <TypeGroup
            key={group.type.id}
            group={group}
            index={index}
            onAddCategory={(typeId) => {
              setCategoryDialog({ category: null, typeId })
            }}
            onEditCategory={(category) => {
              setCategoryDialog({ category, typeId: category.typeId })
            }}
            onDeleteCategory={setPendingCategory}
            onRenameType={(type) => {
              setTypeDialog({ type })
            }}
            onDeleteType={setPendingType}
          />
        ))}
        <FoldRow
          variant="panel"
          total={catalogue.groups.length}
          shown={shown}
          mode="remainder"
          names={foldedNames}
          actionLabel="Show all"
          onShowAll={() => {
            setExpanded(true)
          }}
        />
        <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
          {CATEGORY_COUNT_SCOPE} {CATEGORY_GLOBAL_NOTE}
        </p>
      </div>

      {categoryDialog === null ? null : (
        <CategoryDialog
          onOpenChange={(open) => {
            if (!open) setCategoryDialog(null)
          }}
          category={categoryDialog.category}
          typeId={categoryDialog.typeId}
          types={catalogue.types}
        />
      )}
      {typeDialog === null ? null : (
        <CategoryTypeDialog
          onOpenChange={(open) => {
            if (!open) setTypeDialog(null)
          }}
          type={typeDialog.type}
        />
      )}
      <ConfirmDestructive
        open={pendingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCategory(null)
        }}
        title={`Delete ${pendingCategory?.name ?? "this category"}?`}
        lost="The category disappears from every picker and from the transactions that carried it."
        survives={CATEGORY_DELETE_CONSEQUENCE}
        confirmLabel="Delete category"
        pending={deleteCategory.isPending}
        onConfirm={() => {
          const target = pendingCategory
          if (target === null) return
          deleteCategory.mutate(
            { categoryId: target.id },
            {
              onSettled: () => {
                setPendingCategory(null)
              },
            }
          )
        }}
      />
      <ConfirmDestructive
        open={pendingType !== null}
        onOpenChange={(open) => {
          if (!open) setPendingType(null)
        }}
        title={`Delete the ${pendingType?.name ?? ""} type?`}
        lost="The type disappears from this page and from the type picker."
        survives={CATEGORY_TYPE_DELETE_CONSEQUENCE}
        confirmLabel="Delete type"
        pending={deleteType.isPending}
        onConfirm={() => {
          const target = pendingType
          if (target === null) return
          deleteType.mutate(
            { typeId: target.id },
            {
              onSettled: () => {
                setPendingType(null)
              },
            }
          )
        }}
      />
    </SettingsBlock>
  )
}

export function CategoriesSection() {
  return (
    <SettingsBlocks>
      <PanelBoundary pending={<SettingsGroupsSkeleton />}>
        <CategoryTypesBlock />
      </PanelBoundary>
      <CustomAssetsBlock />
    </SettingsBlocks>
  )
}
