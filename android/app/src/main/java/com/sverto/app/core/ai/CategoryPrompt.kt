package com.sverto.app.core.ai

import uniffi.sverto_core.CategoryItem

private val CATEGORY_ID_PATTERN = Regex("""\d+""")
private val NONE_REPLY_PREFIX = Regex("""^\W*none\b""", RegexOption.IGNORE_CASE)
private val WHITESPACE = Regex("""\s+""")
private const val MAX_DESCRIPTION_CHARS = 200
private const val MAX_NAME_CHARS = 100

fun buildCategoryPrompt(
    description: String,
    categories: List<CategoryItem>,
): String =
    buildString {
        appendLine("Classify a personal finance transaction into one of these categories.")
        appendLine("Categories (id: name):")
        categories.forEach { appendLine("${it.id}: ${sanitize(it.name, MAX_NAME_CHARS)}") }
        appendLine()
        appendLine("Transaction description: \"${sanitize(description, MAX_DESCRIPTION_CHARS)}\"")
        append(
            "Reply with only the id number of the best matching category. " +
                "The id must be one of the ids listed above. If no category fits well, reply NONE.",
        )
    }

fun parseCategoryResponse(
    raw: String,
    categories: List<CategoryItem>,
): CategoryItem? {
    val cleaned = raw.trim()
    if (NONE_REPLY_PREFIX.containsMatchIn(cleaned)) return null
    val validIds =
        CATEGORY_ID_PATTERN
            .findAll(cleaned)
            .mapNotNull { it.value.toIntOrNull() }
            .filter { id -> categories.any { it.id == id } }
            .distinct()
            .toList()
    val id = validIds.singleOrNull() ?: return null
    return categories.first { it.id == id }
}

private fun sanitize(
    text: String,
    maxChars: Int,
): String = text.replace(WHITESPACE, " ").trim().take(maxChars)
