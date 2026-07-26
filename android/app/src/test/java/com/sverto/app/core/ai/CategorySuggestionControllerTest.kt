package com.sverto.app.core.ai

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import uniffi.sverto_core.CategoryItem

private val fastFood = CategoryItem(id = 23, name = "Fast Food", icon = "hamburger")
private val allCategories = listOf(fastFood)

private class Harness(
    var available: Boolean = true,
    var categories: List<CategoryItem> = allCategories,
    var suggestion: CategoryItem? = fastFood,
    var categoriesThrow: Boolean = false,
    var suggestThrow: Boolean = false,
) {
    var suggestCalls = 0
    var stateDuringSuggest: SuggestionState? = null

    val controller: CategorySuggestionController =
        CategorySuggestionController(
            isAvailable = { available },
            loadCategories = {
                if (categoriesThrow) error("network down")
                categories
            },
            suggest = { _, _ ->
                suggestCalls++
                stateDuringSuggest = controller.state.value
                if (suggestThrow) error("inference failed")
                suggestion
            },
        )
}

class CategorySuggestionControllerTest {
    @Test
    fun blankDescriptionIsIgnored() =
        runTest {
            val h = Harness()
            assertNull(h.controller.suggestFor("   "))
            assertEquals(0, h.suggestCalls)
        }

    @Test
    fun unavailableDeviceIsIgnored() =
        runTest {
            val h = Harness(available = false)
            assertNull(h.controller.suggestFor("McDonalds"))
            assertEquals(0, h.suggestCalls)
        }

    @Test
    fun successfulCommitReturnsCategoryAndSettlesToIdle() =
        runTest {
            val h = Harness()
            assertEquals(fastFood, h.controller.suggestFor("McDonalds"))
            assertEquals(SuggestionState.Loading, h.stateDuringSuggest)
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun sameTextDoesNotFireTwice() =
        runTest {
            val h = Harness()
            h.controller.suggestFor("McDonalds")
            assertNull(h.controller.suggestFor("McDonalds"))
            assertNull(h.controller.suggestFor(" McDonalds "))
            assertEquals(1, h.suggestCalls)
        }

    @Test
    fun changedTextFiresAgain() =
        runTest {
            val h = Harness()
            h.controller.suggestFor("McDonalds")
            h.controller.suggestFor("Tesco")
            assertEquals(2, h.suggestCalls)
        }

    @Test
    fun markCommittedSeedsTextSoUneditedCommitDoesNotFire() =
        runTest {
            val h = Harness()
            h.controller.markCommitted("Existing description")
            assertNull(h.controller.suggestFor("Existing description"))
            assertEquals(0, h.suggestCalls)
        }

    @Test
    fun markCommittedStillAllowsEditedText() =
        runTest {
            val h = Harness()
            h.controller.markCommitted("Existing description")
            assertEquals(fastFood, h.controller.suggestFor("Existing description edited"))
        }

    @Test
    fun markCommittedDismissesAPendingChip() =
        runTest {
            val h = Harness()
            h.controller.offer(fastFood)
            h.controller.markCommitted("Rewritten form")
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun markCommittedWithBlankTextLeavesControllerArmed() =
        runTest {
            val h = Harness()
            h.controller.markCommitted("   ")
            assertEquals(fastFood, h.controller.suggestFor("McDonalds"))
        }

    @Test
    fun resetInvalidatesInFlightSuggestion() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val controller =
                CategorySuggestionController(
                    isAvailable = { true },
                    loadCategories = { allCategories },
                    suggest = { _, _ ->
                        gate.await()
                        fastFood
                    },
                )
            val inFlight = async { controller.suggestFor("McDonalds") }
            runCurrent()
            controller.reset()
            gate.complete(Unit)
            assertNull(inFlight.await())
            assertEquals(SuggestionState.Idle, controller.state.value)
        }

    @Test
    fun emptyCategoryListSkipsInference() =
        runTest {
            val h = Harness(categories = emptyList())
            assertNull(h.controller.suggestFor("McDonalds"))
            assertEquals(0, h.suggestCalls)
        }

    @Test
    fun loadCategoriesFailureSettlesToIdle() =
        runTest {
            val h = Harness(categoriesThrow = true)
            assertNull(h.controller.suggestFor("McDonalds"))
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun failedCommitCanRetrySameText() =
        runTest {
            val h = Harness(categoriesThrow = true)
            assertNull(h.controller.suggestFor("McDonalds"))
            h.categoriesThrow = false
            assertEquals(fastFood, h.controller.suggestFor("McDonalds"))
        }

    @Test
    fun suggestFailureSettlesToIdle() =
        runTest {
            val h = Harness(suggestThrow = true)
            assertNull(h.controller.suggestFor("McDonalds"))
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun nullSuggestionSettlesToIdle() =
        runTest {
            val h = Harness(suggestion = null)
            assertNull(h.controller.suggestFor("McDonalds"))
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun offerThenTakeReturnsTheCategoryOnce() =
        runTest {
            val h = Harness()
            h.controller.offer(fastFood)
            assertEquals(SuggestionState.Suggested(fastFood), h.controller.state.value)
            assertEquals(fastFood, h.controller.takeSuggestion())
            assertNull(h.controller.takeSuggestion())
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun descriptionChangeDismissesAnOfferedChip() =
        runTest {
            val h = Harness()
            h.controller.suggestFor("McDonalds")
            h.controller.offer(fastFood)
            h.controller.onDescriptionChanged("McDonalds x")
            assertEquals(SuggestionState.Idle, h.controller.state.value)
        }

    @Test
    fun unchangedDescriptionKeepsTheOfferedChip() =
        runTest {
            val h = Harness()
            h.controller.suggestFor("McDonalds")
            h.controller.offer(fastFood)
            h.controller.onDescriptionChanged("McDonalds")
            assertTrue(h.controller.state.value is SuggestionState.Suggested)
        }

    @Test
    fun resetClearsStateAndDoesNotBlockANewText() =
        runTest {
            val h = Harness()
            h.controller.offer(fastFood)
            h.controller.reset()
            assertEquals(SuggestionState.Idle, h.controller.state.value)
            assertNotNull(h.controller.suggestFor("Tesco"))
        }

    @Test
    fun staleCommitDoesNotClobberNewerStateOrReturnResult() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val controller =
                CategorySuggestionController(
                    isAvailable = { true },
                    loadCategories = { allCategories },
                    suggest = { text, _ ->
                        if (text == "Slow") gate.await()
                        fastFood
                    },
                )
            val slow = async { controller.suggestFor("Slow") }
            runCurrent()
            assertEquals(fastFood, controller.suggestFor("Fast"))
            controller.offer(fastFood)
            gate.complete(Unit)
            assertNull(slow.await())
            assertTrue(controller.state.value is SuggestionState.Suggested)
        }

    @Test
    fun cancellationPropagatesOutOfSuggestFor() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val controller =
                CategorySuggestionController(
                    isAvailable = { true },
                    loadCategories = { allCategories },
                    suggest = { _, _ ->
                        gate.await()
                        fastFood
                    },
                )
            var completedNormally = false
            val job =
                launch {
                    controller.suggestFor("McDonalds")
                    completedNormally = true
                }
            runCurrent()
            job.cancel()
            runCurrent()
            assertFalse(completedNormally)
        }
}
