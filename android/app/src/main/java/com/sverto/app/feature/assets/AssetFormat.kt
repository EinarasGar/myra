package com.sverto.app.feature.assets

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun formatRate(value: Double): String = String.format(Locale.US, "%,.4f", value)

fun formatUnixDate(unixSeconds: Long): String {
    val fmt = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
    return fmt.format(Date(unixSeconds * 1000))
}
