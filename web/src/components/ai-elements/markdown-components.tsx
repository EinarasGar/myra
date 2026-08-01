/* eslint-disable react-refresh/only-export-components */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
} from "react"
import { ArrowUpRight } from "lucide-react"
import type { Components, ExtraProps } from "streamdown"
import { useIsCodeFenceIncomplete } from "streamdown"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives"

import { CodeBlock } from "./code-block"
import { CopyButton } from "./copy-button"
import {
  fenceSource,
  tableColumnAlignment,
  tableToTsv,
  type ColumnAlign,
} from "./hast"
import { withFigures } from "./markdown-figures"
import { isExternalHref, safeImageSrc, safeLinkHref } from "./markdown-url"
import { MermaidDiagram } from "./mermaid-diagram"

const BODY = "text-[13px] leading-[1.65] text-pretty text-ink"
const EYEBROW =
  "text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase"

const ColumnAlignContext = createContext<readonly ColumnAlign[]>([])

type CellProps = ComponentProps<"td"> &
  ExtraProps & { "data-column"?: number | undefined }

type CellAlign = "left" | "center" | "right"

const ALIGN_CLASS: Record<CellAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right whitespace-nowrap",
}

function useCellAlign(
  column: number | undefined,
  style: CSSProperties | undefined
): { align: CellAlign; style: CSSProperties | undefined } {
  const alignment = useContext(ColumnAlignContext)
  const declared = style?.textAlign
  const align: CellAlign =
    declared === "right" || declared === "center"
      ? declared
      : column === undefined
        ? "left"
        : (alignment[column] ?? "left")
  if (style === undefined) return { align, style: undefined }
  const { textAlign: _declared, ...remaining } = style
  return {
    align,
    style: Object.keys(remaining).length === 0 ? undefined : remaining,
  }
}

function Heading1({
  node: _node,
  children,
  ...rest
}: ComponentProps<"h1"> & ExtraProps) {
  return (
    <h1
      className="mt-[22px] mb-[10px] text-[15px] leading-[1.3] font-bold tracking-[-0.012em] text-ink"
      {...rest}
    >
      {withFigures(children)}
    </h1>
  )
}

function Heading2({
  node: _node,
  children,
  ...rest
}: ComponentProps<"h2"> & ExtraProps) {
  return (
    <h2
      className="mt-5 mb-[9px] text-[13.5px] leading-[1.35] font-semibold tracking-[-0.01em] text-ink"
      {...rest}
    >
      {withFigures(children)}
    </h2>
  )
}

function Heading3({
  node: _node,
  children,
  ...rest
}: ComponentProps<"h3"> & ExtraProps) {
  return (
    <h3 className="mt-[18px] mb-3 flex items-center gap-[10px]" {...rest}>
      <span className={EYEBROW}>{children}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </h3>
  )
}

function Heading4({
  node: _node,
  children,
  ...rest
}: ComponentProps<"h4"> & ExtraProps) {
  return (
    <h4
      className="mt-4 mb-2 text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase"
      {...rest}
    >
      {children}
    </h4>
  )
}

function Paragraph({
  node: _node,
  children,
  ...rest
}: ComponentProps<"p"> & ExtraProps) {
  return (
    <p className={cn("my-[9px]", BODY)} {...rest}>
      {withFigures(children)}
    </p>
  )
}

function Strong({
  node: _node,
  children,
  ...rest
}: ComponentProps<"strong"> & ExtraProps) {
  return (
    <strong className="font-semibold text-ink" {...rest}>
      {withFigures(children)}
    </strong>
  )
}

function Emphasis({
  node: _node,
  children,
  ...rest
}: ComponentProps<"em"> & ExtraProps) {
  return (
    <em className="italic" {...rest}>
      {withFigures(children)}
    </em>
  )
}

function Strikethrough({
  node: _node,
  children,
  ...rest
}: ComponentProps<"del"> & ExtraProps) {
  return (
    <del className="text-ink-3 line-through" {...rest}>
      {children}
    </del>
  )
}

function Rule({ node: _node, ...rest }: ComponentProps<"hr"> & ExtraProps) {
  return <hr className="my-4 h-px border-0 bg-border" {...rest} />
}

function Quote({
  node: _node,
  children,
  ...rest
}: ComponentProps<"blockquote"> & ExtraProps) {
  return (
    <blockquote
      className="my-3 border-l-2 border-border-strong py-px pl-[13px] text-ink-2 [&_p]:my-[6px] [&_p]:text-ink-2"
      {...rest}
    >
      {children}
    </blockquote>
  )
}

function UnorderedList({
  node: _node,
  children,
  ...rest
}: ComponentProps<"ul"> & ExtraProps) {
  return (
    <ul
      className="my-[9px] flex list-outside list-disc flex-col gap-[5px] pl-[19px] marker:text-ink-3"
      {...rest}
    >
      {children}
    </ul>
  )
}

function OrderedList({
  node: _node,
  children,
  ...rest
}: ComponentProps<"ol"> & ExtraProps) {
  return (
    <ol
      className="my-[9px] flex list-outside list-decimal flex-col gap-[5px] pl-[21px] marker:font-mono marker:text-[11.5px] marker:text-ink-3"
      {...rest}
    >
      {children}
    </ol>
  )
}

function ListItem({
  node: _node,
  children,
  className,
  ...rest
}: ComponentProps<"li"> & ExtraProps) {
  return (
    <li
      className={cn(
        BODY,
        "ps-[3px] [&>ol]:my-[5px] [&>p]:my-0 [&>ul]:my-[5px]",
        className?.includes("task-list-item") === true &&
          "flex list-none items-baseline gap-2 ps-0",
        className
      )}
      {...rest}
    >
      {withFigures(children)}
    </li>
  )
}

function TaskCheckbox({
  node: _node,
  className,
  ...rest
}: ComponentProps<"input"> & ExtraProps) {
  return (
    <input
      className={cn(
        "size-[13px] flex-none translate-y-[2px] rounded-chip border-[1.5px] border-border-strong accent-brand",
        className
      )}
      {...rest}
    />
  )
}

function Anchor({
  node: _node,
  target: _target,
  rel: _rel,
  children,
  href,
  ...rest
}: ComponentProps<"a"> & ExtraProps) {
  const safe = href === undefined ? null : safeLinkHref(href)
  if (safe === null) {
    return (
      <span
        data-slot="markdown-unsafe-link"
        className="text-ink-2 underline decoration-dotted"
      >
        {children}
      </span>
    )
  }
  const external = isExternalHref(safe)
  return (
    <a
      href={safe}
      {...(external
        ? { target: "_blank", rel: "noreferrer noopener nofollow" }
        : {})}
      className={cn(
        "font-medium text-brand underline decoration-border-strong underline-offset-2 transition-colors duration-instant ease-out-quick hover:decoration-brand",
        focusRing.chip
      )}
      {...rest}
    >
      {children}
      {external ? (
        <ArrowUpRight
          aria-hidden
          strokeWidth={2}
          className="ml-[1px] inline-block size-[11px] translate-y-[-1px] text-ink-3"
        />
      ) : null}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  )
}

function Image({
  node: _node,
  src,
  alt,
  ...rest
}: ComponentProps<"img"> & ExtraProps) {
  const safe = typeof src === "string" ? safeImageSrc(src) : null
  if (safe === null) return null
  return (
    <img
      src={safe}
      alt={alt ?? ""}
      loading="lazy"
      className="my-3 max-w-full rounded-md border border-border"
      {...rest}
    />
  )
}

function InlineCode({
  node: _node,
  children,
  ...rest
}: ComponentProps<"code"> & ExtraProps) {
  return (
    <code
      className="rounded-chip border border-border bg-surface-2 px-[5px] py-[2px] font-mono text-[11.5px] text-ink"
      {...rest}
    >
      {children}
    </code>
  )
}

function Fence({ node }: ComponentProps<"pre"> & ExtraProps) {
  const incomplete = useIsCodeFenceIncomplete()
  const { code, language } = fenceSource(node)
  if (language === "mermaid" && !incomplete) {
    return <MermaidDiagram source={code} />
  }
  return <CodeBlock code={code} language={language} incomplete={incomplete} />
}

function MarkdownTable({
  node,
  children,
  ...rest
}: ComponentProps<"table"> & ExtraProps) {
  const alignment = useMemo(() => tableColumnAlignment(node), [node])
  const tsv = useMemo(() => tableToTsv(node), [node])

  return (
    <ColumnAlignContext value={alignment}>
      <div
        data-slot="markdown-table"
        className="group/table relative my-3 min-w-0 overflow-hidden rounded-md border border-border bg-surface"
      >
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-left" {...rest}>
            {children}
          </table>
        </div>
        <CopyButton
          value={tsv}
          label="Copy table"
          className="absolute top-[3px] right-[3px] bg-surface-2 opacity-0 transition-opacity duration-quick ease-out-quick group-focus-within/table:opacity-100 group-hover/table:opacity-100 [@media(pointer:coarse)]:opacity-100"
        />
      </div>
    </ColumnAlignContext>
  )
}

function TableHead({
  node: _node,
  children,
  ...rest
}: ComponentProps<"thead"> & ExtraProps) {
  return (
    <thead className="border-b border-border bg-surface-2" {...rest}>
      {children}
    </thead>
  )
}

function TableRow({
  node: _node,
  children,
  ...rest
}: ComponentProps<"tr"> & ExtraProps) {
  return (
    <tr className="border-b border-border last:border-b-0" {...rest}>
      {Children.toArray(children)
        .filter((child) => isValidElement(child))
        .map((child, column) =>
          cloneElement(child as ReactElement<CellProps>, {
            "data-column": column,
          })
        )}
    </tr>
  )
}

function HeaderCell({
  node: _node,
  children,
  style: declared,
  ...rest
}: CellProps) {
  const { align, style } = useCellAlign(rest["data-column"], declared)
  return (
    <th
      scope="col"
      style={style}
      className={cn(
        "px-[13px] py-[8px] text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase",
        ALIGN_CLASS[align]
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

function BodyCell({
  node: _node,
  children,
  style: declared,
  ...rest
}: CellProps) {
  const { align, style } = useCellAlign(rest["data-column"], declared)
  return (
    <td
      style={style}
      className={cn(
        "px-[13px] py-[9px] align-top text-[12.5px] leading-[1.45] text-ink",
        ALIGN_CLASS[align]
      )}
      {...rest}
    >
      {withFigures(children)}
    </td>
  )
}

export const markdownComponents: Components = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading4,
  h6: Heading4,
  p: Paragraph,
  strong: Strong,
  em: Emphasis,
  del: Strikethrough,
  hr: Rule,
  blockquote: Quote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  input: TaskCheckbox,
  a: Anchor,
  img: Image,
  inlineCode: InlineCode,
  pre: Fence,
  table: MarkdownTable,
  thead: TableHead,
  tr: TableRow,
  th: HeaderCell,
  td: BodyCell,
}
