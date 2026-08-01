import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SkeletonBar } from "@/components/states/loading-state"
import { focusRing } from "@/components/primitives"

export function StepButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string
  glyph: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "font-mono text-[11px] leading-none font-medium text-ink-3 outline-none disabled:opacity-40",
        focusRing.chip
      )}
    >
      {glyph}
    </button>
  )
}

export function DrawerSkeleton({
  label = "Loading this transaction",
}: {
  label?: string
}) {
  return (
    <div role="status" aria-busy className="flex flex-col gap-4 px-5 py-5">
      <span className="sr-only">{label}</span>
      <SkeletonBar width={120} height={16} />
      <SkeletonBar width={200} height={30} anchor />
      <SkeletonBar width="70%" height={10} />
      <SkeletonBar width="100%" height={44} />
      <SkeletonBar width="100%" height={44} />
      <SkeletonBar width="100%" height={44} />
    </div>
  )
}

export function FooterButton({
  children,
  variant,
  blockedReason,
  onClick,
}: {
  children: React.ReactNode
  variant: "primary" | "outline" | "danger"
  blockedReason: string | null
  onClick?: () => void
}) {
  const blocked = blockedReason !== null
  return (
    <Button
      variant={
        variant === "primary"
          ? "default"
          : variant === "outline"
            ? "outline"
            : "ghost"
      }
      disabled={blocked}
      {...(blocked ? { title: blockedReason } : {})}
      onClick={onClick}
      className={cn(
        "h-auto rounded-sm px-[14px] py-2 text-[12px] leading-none font-semibold",
        variant === "danger" && "text-negative hover:text-negative"
      )}
    >
      {children}
    </Button>
  )
}
