package com.sverto.app.feature.transactions.quickupload

data class ProposalSummary(
    val description: String,
    val date: String,
    val amount: String?,
)

enum class QuickUploadStatus {
    QUEUED,
    UPLOADING,
    PROCESSING,
    READY,
    FAILED,
}

data class QuickUploadUiItem(
    val id: String,
    val isLocal: Boolean,
    val status: QuickUploadStatus,
    val thumbnailBytes: ByteArray?,
    val proposalType: String?,
    val proposalSummary: ProposalSummary?,
    val errorMessage: String?,
    val createdAt: Long,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is QuickUploadUiItem) return false
        return id == other.id && status == other.status && proposalSummary == other.proposalSummary && errorMessage == other.errorMessage
    }

    override fun hashCode(): Int = id.hashCode()
}
