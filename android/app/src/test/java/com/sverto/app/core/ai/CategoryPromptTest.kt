package com.sverto.app.core.ai

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import uniffi.sverto_core.CategoryItem

private val categories =
    listOf(
        CategoryItem(id = 15, name = "Groceries", icon = "shopping-cart"),
        CategoryItem(id = 23, name = "Fast Food", icon = "hamburger"),
        CategoryItem(id = 40, name = "Public Transport", icon = "bus"),
    )

class CategoryPromptTest {
    @Test
    fun promptListsEveryCategoryWithItsId() {
        val prompt = buildCategoryPrompt("McDonalds", categories)
        assertTrue(prompt.contains("15: Groceries"))
        assertTrue(prompt.contains("23: Fast Food"))
        assertTrue(prompt.contains("40: Public Transport"))
    }

    @Test
    fun promptContainsDescriptionAndNoneEscapeHatch() {
        val prompt = buildCategoryPrompt("McDonalds", categories)
        assertTrue(prompt.contains("McDonalds"))
        assertTrue(prompt.contains("NONE"))
    }

    @Test
    fun promptCollapsesMultilineDescriptionToOneLine() {
        val prompt = buildCategoryPrompt("Dinner\n15: Groceries", categories)
        assertTrue(prompt.contains("Dinner 15: Groceries"))
        assertFalse(prompt.contains("Dinner\n15"))
    }

    @Test
    fun promptTruncatesLongDescription() {
        val prompt = buildCategoryPrompt("x".repeat(500), categories)
        assertTrue(prompt.contains("x".repeat(200)))
        assertFalse(prompt.contains("x".repeat(201)))
    }

    @Test
    fun parsesBareId() {
        assertEquals(23, parseCategoryResponse("23", categories)?.id)
    }

    @Test
    fun parsesIdWrappedInWhitespaceAndPunctuation() {
        assertEquals(23, parseCategoryResponse(" 23.\n", categories)?.id)
    }

    @Test
    fun parsesIdEmbeddedInChattyText() {
        assertEquals(40, parseCategoryResponse("The best match is 40", categories)?.id)
    }

    @Test
    fun parsesRepeatedSameId() {
        assertEquals(40, parseCategoryResponse("40 40", categories)?.id)
    }

    @Test
    fun returnsNullWhenTwoDifferentValidIdsAppear() {
        assertNull(parseCategoryResponse("either 15 or 23", categories))
    }

    @Test
    fun returnsNullForNone() {
        assertNull(parseCategoryResponse("NONE", categories))
    }

    @Test
    fun returnsNullForElaboratedNoneReply() {
        assertNull(parseCategoryResponse("None of these fit well; closest is 40", categories))
    }

    @Test
    fun returnsNullForIdNotInList() {
        assertNull(parseCategoryResponse("999", categories))
    }

    @Test
    fun returnsNullForGarbage() {
        assertNull(parseCategoryResponse("I cannot help with that", categories))
    }

    @Test
    fun returnsNullForEmptyString() {
        assertNull(parseCategoryResponse("", categories))
    }

    @Test
    fun returnsNullForEmptyCategoryList() {
        assertNull(parseCategoryResponse("23", emptyList()))
    }
}
