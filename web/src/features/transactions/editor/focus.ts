const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([aria-hidden="true"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)'

export function firstControl(root: HTMLElement | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>(CONTROL_SELECTOR) ?? null
}

export function firstInvalidControl(
  root: HTMLElement | null
): HTMLElement | null {
  return root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? null
}
