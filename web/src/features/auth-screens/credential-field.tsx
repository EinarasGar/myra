import { useId, type ReactNode } from "react"

import { Input } from "@/components/ui/input"

export function CredentialField({
  label,
  note,
  value,
  onValueChange,
  type = "text",
  autoComplete,
  disabled,
  errors = [],
}: {
  label: ReactNode
  note?: ReactNode
  value: string
  onValueChange: (value: string) => void
  type?: "text" | "password"
  autoComplete?: string
  disabled?: boolean
  errors?: readonly string[]
}) {
  const id = useId()
  const errorId = `${id}-error`
  const invalid = errors.length > 0

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...(autoComplete === undefined ? {} : { autoComplete })}
        disabled={disabled ?? false}
        aria-invalid={invalid}
        {...(invalid ? { "aria-describedby": errorId } : {})}
        className="h-auto rounded-md px-[14px] py-[12px] text-[13px] font-normal"
      />
      {invalid ? (
        <p
          id={errorId}
          role="alert"
          className="text-[11.5px] leading-[1.5] text-pretty text-negative"
        >
          {errors.join(" ")}
        </p>
      ) : note ? (
        <p className="text-[11.5px] leading-[1.5] text-pretty text-ink-3">
          {note}
        </p>
      ) : null}
    </div>
  )
}
