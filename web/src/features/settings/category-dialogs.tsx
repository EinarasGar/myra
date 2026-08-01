import { useState } from "react"

import { useUserId } from "@/auth"
import type { Category } from "@/lib/domain/refs"
import type { CategoryType } from "@/features/categories/api"
import {
  categoryFormSchema,
  categoryTypeFormSchema,
  useCreateCategory,
  useCreateCategoryType,
  useUpdateCategory,
  useUpdateCategoryType,
} from "@/features/categories/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { EntityPicker, IconPicker } from "@/components/primitives"

import { CATEGORY_ICON_HINT } from "./copy"

type FieldIssues = Partial<Record<string, string>>

function issuesOf(error: {
  issues: readonly { path: PropertyKey[]; message: string }[]
}): FieldIssues {
  const issues: FieldIssues = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "")
    if (key !== "" && issues[key] === undefined) issues[key] = issue.message
  }
  return issues
}

export function CategoryDialog({
  onOpenChange,
  category,
  typeId,
  types,
}: {
  onOpenChange: (open: boolean) => void
  category: Category | null
  typeId: number | null
  types: readonly CategoryType[]
}) {
  const userId = useUserId()
  const create = useCreateCategory(userId)
  const update = useUpdateCategory(userId)
  const [name, setName] = useState(category?.name ?? "")
  const [icon, setIcon] = useState(category?.icon ?? "circle")
  const [selectedType, setSelectedType] = useState(
    String(category?.typeId ?? typeId ?? types[0]?.id ?? "")
  )
  const [issues, setIssues] = useState<FieldIssues>({})

  const pending = create.isPending || update.isPending

  function submit() {
    const parsed = categoryFormSchema.safeParse({
      category: name,
      icon,
      category_type_id: Number(selectedType),
    })
    if (!parsed.success) {
      setIssues(issuesOf(parsed.error))
      return
    }
    setIssues({})
    const done = () => {
      onOpenChange(false)
    }
    if (category === null) {
      create.mutate({ body: parsed.data }, { onSuccess: done })
    } else {
      update.mutate(
        { categoryId: category.id, body: parsed.data },
        { onSuccess: done }
      )
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category === null ? "New category" : `Rename ${category.name}`}
          </DialogTitle>
          <DialogDescription>
            Categories belong to exactly one type. Moving one between types
            changes where it is listed and nothing else.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field data-invalid={issues.category !== undefined}>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
            {issues.category ? (
              <FieldError>{issues.category}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={issues.icon !== undefined}>
            <FieldLabel htmlFor="category-icon">Icon</FieldLabel>
            <IconPicker
              id="category-icon"
              value={icon === "" ? null : icon}
              invalid={issues.icon !== undefined}
              onValueChange={(next) => {
                setIcon(next ?? "")
              }}
            />
            <FieldDescription>{CATEGORY_ICON_HINT}</FieldDescription>
            {issues.icon ? <FieldError>{issues.icon}</FieldError> : null}
          </Field>
          <Field data-invalid={issues.category_type_id !== undefined}>
            <FieldLabel htmlFor="category-type">Type</FieldLabel>
            <EntityPicker
              id="category-type"
              value={selectedType}
              placeholder="Select a type"
              invalid={issues.category_type_id !== undefined}
              options={types.map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              onValueChange={(next) => {
                setSelectedType(next ?? "")
              }}
            />
            {issues.category_type_id ? (
              <FieldError>{issues.category_type_id}</FieldError>
            ) : null}
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending ? "Saving…" : category === null ? "Add category" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CategoryTypeDialog({
  onOpenChange,
  type,
}: {
  onOpenChange: (open: boolean) => void
  type: CategoryType | null
}) {
  const userId = useUserId()
  const create = useCreateCategoryType(userId)
  const update = useUpdateCategoryType(userId)
  const [name, setName] = useState(type?.name ?? "")
  const [issues, setIssues] = useState<FieldIssues>({})

  const pending = create.isPending || update.isPending

  function submit() {
    const parsed = categoryTypeFormSchema.safeParse({ name })
    if (!parsed.success) {
      setIssues(issuesOf(parsed.error))
      return
    }
    setIssues({})
    const done = () => {
      onOpenChange(false)
    }
    if (type === null) {
      create.mutate({ body: parsed.data }, { onSuccess: done })
    } else {
      update.mutate({ typeId: type.id, body: parsed.data }, { onSuccess: done })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === null ? "New category type" : `Rename ${type.name}`}
          </DialogTitle>
          <DialogDescription>
            A type is a folder for categories. An empty type stays on this page
            until you put something in it.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={issues.name !== undefined}>
          <FieldLabel htmlFor="category-type-name">Name</FieldLabel>
          <Input
            id="category-type-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          {issues.name ? <FieldError>{issues.name}</FieldError> : null}
        </Field>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending ? "Saving…" : type === null ? "Add type" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
