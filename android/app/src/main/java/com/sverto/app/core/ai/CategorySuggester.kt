package com.sverto.app.core.ai

import android.os.Build
import android.util.Log
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import uniffi.sverto_core.CategoryItem
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.cancellation.CancellationException

private const val TAG = "CategorySuggester"
private const val INFERENCE_TIMEOUT_MS = 10_000L
private const val MIN_SDK_FOR_ML_KIT = 26

object CategorySuggester {
    private val model by lazy { Generation.getClient() }

    @Volatile
    private var availability: Boolean? = null

    private val downloadStarted = AtomicBoolean(false)

    suspend fun isAvailable(): Boolean {
        if (Build.VERSION.SDK_INT < MIN_SDK_FOR_ML_KIT) return false
        availability?.let { return it }
        return try {
            when (model.checkStatus()) {
                FeatureStatus.AVAILABLE -> {
                    availability = true
                    true
                }
                FeatureStatus.UNAVAILABLE -> {
                    availability = false
                    false
                }
                else -> false
            }
        } catch (e: CancellationException) {
            throw e
        } catch (
            @Suppress("TooGenericExceptionCaught") e: Exception,
        ) {
            Log.w(TAG, "checkStatus failed", e)
            false
        }
    }

    fun prefetch(scope: CoroutineScope) {
        if (Build.VERSION.SDK_INT < MIN_SDK_FOR_ML_KIT) return
        scope.launch(Dispatchers.IO) {
            try {
                when (model.checkStatus()) {
                    FeatureStatus.AVAILABLE -> model.warmup()
                    FeatureStatus.DOWNLOADABLE -> downloadOnce()
                    else -> {}
                }
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.w(TAG, "prefetch failed", e)
            }
        }
    }

    private suspend fun downloadOnce() {
        if (!downloadStarted.compareAndSet(false, true)) return
        try {
            model.download().collect { status ->
                if (status is DownloadStatus.DownloadFailed) throw status.e
            }
        } catch (
            @Suppress("TooGenericExceptionCaught") e: Exception,
        ) {
            downloadStarted.set(false)
            throw e
        }
    }

    suspend fun suggest(
        description: String,
        categories: List<CategoryItem>,
    ): CategoryItem? {
        if (!isAvailable()) return null
        return withTimeoutOrNull(INFERENCE_TIMEOUT_MS) {
            try {
                val response = model.generateContent(buildCategoryPrompt(description, categories))
                parseCategoryResponse(
                    response.candidates
                        .firstOrNull()
                        ?.text
                        .orEmpty(),
                    categories,
                )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.w(TAG, "suggest failed", e)
                null
            }
        }
    }
}
