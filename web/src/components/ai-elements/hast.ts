import type { Element, Nodes, Parents } from "hast"

import { isFigureText } from "./markdown-figures"

export type ColumnAlign = "left" | "right"

export function nodeText(node: Nodes | undefined): string {
  if (node === undefined) return ""
  if (node.type === "text") return node.value
  if (!("children" in node)) return ""
  return node.children.map((child) => nodeText(child)).join("")
}

function elements(node: Parents | undefined, tagName: string): Element[] {
  if (node === undefined) return []
  const found: Element[] = []
  for (const child of node.children) {
    if (child.type !== "element") continue
    if (child.tagName === tagName) found.push(child)
    else found.push(...elements(child, tagName))
  }
  return found
}

function cells(row: Element): Element[] {
  return row.children.filter(
    (child): child is Element =>
      child.type === "element" &&
      (child.tagName === "td" || child.tagName === "th")
  )
}

export function tableGrid(node: Parents | undefined): string[][] {
  return elements(node, "tr").map((row) =>
    cells(row).map((cell) => nodeText(cell))
  )
}

export function tableColumnAlignment(
  node: Parents | undefined
): readonly ColumnAlign[] {
  const grid = tableGrid(node)
  const body = grid.slice(1)
  const width = grid.reduce((widest, row) => Math.max(widest, row.length), 0)
  return Array.from({ length: width }, (_, column) => {
    const values = body
      .map((row) => (row[column] ?? "").trim())
      .filter((value) => value !== "")
    return values.length > 0 && values.every(isFigureText) ? "right" : "left"
  })
}

export function tableToTsv(node: Parents | undefined): string {
  return tableGrid(node)
    .map((row) => row.map((cell) => cell.trim()).join("\t"))
    .join("\n")
}

export function fenceSource(node: Parents | undefined): {
  code: string
  language: string
} {
  const codeNode = elements(node, "code")[0]
  const raw: unknown = codeNode?.properties.className
  const names = Array.isArray(raw)
    ? (raw as unknown[]).map((name) => String(name))
    : typeof raw === "string"
      ? raw.split(" ")
      : []
  const language =
    names.find((name) => name.startsWith("language-"))?.slice(9) ?? ""
  return { code: nodeText(codeNode).replace(/\n$/, ""), language }
}
