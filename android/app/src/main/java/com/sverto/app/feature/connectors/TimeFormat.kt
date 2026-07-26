package com.sverto.app.feature.connectors

import android.text.format.DateUtils
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

internal fun relativeTime(epochSeconds: Long): String =
    DateUtils
        .getRelativeTimeSpanString(
            epochSeconds * 1000,
            System.currentTimeMillis(),
            DateUtils.MINUTE_IN_MILLIS,
        ).toString()

private val absoluteDateFormatter = DateTimeFormatter.ofPattern("d MMM uuuu", Locale.getDefault())

internal fun absoluteDate(epochSeconds: Long): String =
    Instant
        .ofEpochSecond(epochSeconds)
        .atZone(ZoneId.systemDefault())
        .format(absoluteDateFormatter)
