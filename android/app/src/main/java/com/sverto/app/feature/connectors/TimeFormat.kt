package com.sverto.app.feature.connectors

import android.text.format.DateUtils

internal fun relativeTime(epochSeconds: Long): String =
    DateUtils
        .getRelativeTimeSpanString(
            epochSeconds * 1000,
            System.currentTimeMillis(),
            DateUtils.MINUTE_IN_MILLIS,
        ).toString()
