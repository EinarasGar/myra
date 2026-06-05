package com.sverto.app.feature.categories.components

/** Result emitted on save. id == null means create. */
data class CategoryFormResult(
    val id: Int?,
    val name: String,
    val icon: String,
    val typeId: Int,
)
