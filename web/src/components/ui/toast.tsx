import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

const toastManager = ToastPrimitive.createToastManager()

type ToastAddOptions = Parameters<typeof toastManager.add>[0]

export const TOAST_TIMEOUT_MS = 6000

/** A failure has to stay put: it is the only record of what did not happen. */
function withFailurePolicy(options: ToastAddOptions): ToastAddOptions {
  if (options.type !== "error") return options
  return { ...options, timeout: 0 }
}

const toast = {
  add: (options: ToastAddOptions) =>
    toastManager.add(withFailurePolicy(options)),
  close: toastManager.close,
  update: toastManager.update,
  promise: toastManager.promise,
}

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-[360px] outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  )
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-md border border-border-strong bg-surface-2 bg-clip-padding text-ink outline-hidden will-change-transform select-none",
        focusRing.md,
        "[--gap:0.625rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.625rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "[transition:transform_var(--duration-sheet)_var(--ease-out-quick),opacity_var(--duration-sheet)_var(--ease-out-quick),height_var(--duration-quick)_var(--ease-out-quick)]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-[11px] overflow-hidden px-[13px] py-[11px] transition-opacity duration-base ease-out-quick data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-[12px] leading-[1.5] font-semibold", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "text-[12px] leading-[1.5] text-pretty text-ink-2",
        className
      )}
      {...props}
    />
  )
}

function ToastAction({
  className,
  tone,
  ...props
}: ToastPrimitive.Action.Props & { tone?: string | undefined }) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "relative shrink-0 text-[11.5px] leading-none font-semibold outline-hidden after:absolute after:-inset-3 after:content-['']",
        tone === "error" ? "text-negative" : "text-brand",
        focusRing.chip,
        className
      )}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      className={cn(
        "relative shrink-0 text-[12px] leading-none font-normal text-ink-3 outline-hidden after:absolute after:-inset-3 after:content-[''] hover:text-ink",
        focusRing.chip,
        className
      )}
      {...props}
    >
      {children ?? <span aria-hidden>✕</span>}
    </ToastPrimitive.Close>
  )
}

const TOAST_GLYPHS = {
  success: { glyph: "✓", tone: "text-positive" },
  info: { glyph: "✦", tone: "text-brand" },
  warning: { glyph: "△", tone: "text-attention" },
  error: { glyph: "△", tone: "text-negative" },
} as const

function isGlyphType(type: string): type is keyof typeof TOAST_GLYPHS {
  return type in TOAST_GLYPHS
}

function ToastIcon({ type }: { type: string | undefined }) {
  if (type === "loading") {
    return (
      <span
        aria-hidden
        data-slot="toast-icon"
        className="size-[11px] shrink-0 animate-spin rounded-full border-[1.5px] border-border-strong border-t-brand"
      />
    )
  }

  if (type === undefined || !isGlyphType(type)) return null
  const { glyph, tone } = TOAST_GLYPHS[type]

  return (
    <span
      aria-hidden
      data-slot="toast-icon"
      data-tone={type}
      className={cn(
        "shrink-0 self-start pt-[2px] font-mono text-[12px] leading-none font-semibold",
        tone
      )}
    >
      {glyph}
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction tone={toastItem.type} />
        <ToastClose />
      </ToastContent>
    </Toast>
  ))
}

function Toaster({
  children,
  timeout = TOAST_TIMEOUT_MS,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} timeout={timeout} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
