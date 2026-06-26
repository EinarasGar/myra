package com.sverto.app.feature.transactions.quickupload

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream
import java.io.InputStream

private const val MAX_IMAGE_BYTES = 10 * 1024 * 1024
private const val READ_CHUNK_BYTES = 8 * 1024
private const val THUMBNAIL_WIDTH = 200
private const val THUMBNAIL_QUALITY = 60

fun prepareQuickUpload(
    context: Context,
    uri: Uri,
): PreparedQuickUpload? =
    runCatching {
        if (uri.scheme != ContentResolver.SCHEME_CONTENT) return@runCatching null
        val resolver = context.contentResolver
        val imageBytes = resolver.openInputStream(uri)?.use { readCapped(it, MAX_IMAGE_BYTES) } ?: return@runCatching null
        val thumbnail = buildThumbnail(imageBytes) ?: return@runCatching null
        PreparedQuickUpload(imageBytes, thumbnail, imageMimeType(resolver.getType(uri)))
    }.getOrNull()

private fun readCapped(
    input: InputStream,
    maxBytes: Int,
): ByteArray? {
    val buffer = ByteArrayOutputStream()
    val chunk = ByteArray(READ_CHUNK_BYTES)
    while (true) {
        val read = input.read(chunk)
        if (read == -1) break
        if (buffer.size() + read > maxBytes) return null
        buffer.write(chunk, 0, read)
    }
    return if (buffer.size() == 0) null else buffer.toByteArray()
}

private fun buildThumbnail(imageBytes: ByteArray): ByteArray? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, bounds)
    if (bounds.outWidth <= 0) return null

    val options = BitmapFactory.Options().apply { inSampleSize = sampleSizeFor(bounds.outWidth, THUMBNAIL_WIDTH) }
    val decoded = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options) ?: return null
    val thumbHeight = (decoded.height * THUMBNAIL_WIDTH / decoded.width.coerceAtLeast(1)).coerceAtLeast(1)
    val thumbnail = Bitmap.createScaledBitmap(decoded, THUMBNAIL_WIDTH, thumbHeight, true)

    val out = ByteArrayOutputStream()
    thumbnail.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, out)
    if (thumbnail !== decoded) decoded.recycle()
    thumbnail.recycle()
    return out.toByteArray()
}

private fun sampleSizeFor(
    srcWidth: Int,
    targetWidth: Int,
): Int {
    var sample = 1
    var width = srcWidth
    while (width / 2 >= targetWidth) {
        width /= 2
        sample *= 2
    }
    return sample
}

private fun imageMimeType(resolverType: String?): String {
    if (resolverType?.startsWith("image/") == true) return resolverType
    return "image/jpeg"
}
