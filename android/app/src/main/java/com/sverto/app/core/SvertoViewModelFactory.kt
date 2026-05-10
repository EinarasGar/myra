package com.sverto.app.core

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.sverto.app.SvertoApp
import com.sverto.app.feature.portfolio.HomeViewModel
import com.sverto.app.feature.transactions.TransactionsViewModel
import com.sverto.app.feature.transactions.create.CreateTransactionViewModel
import com.sverto.app.feature.transactions.group.CreateTransactionGroupViewModel

object SvertoViewModelFactory : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(
        modelClass: Class<T>,
        extras: CreationExtras,
    ): T {
        val app = extras[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as SvertoApp
        val apiClient = app.apiClient
        return when {
            modelClass.isAssignableFrom(HomeViewModel::class.java) ->
                HomeViewModel(apiClient) as T
            modelClass.isAssignableFrom(TransactionsViewModel::class.java) ->
                TransactionsViewModel(apiClient) as T
            modelClass.isAssignableFrom(CreateTransactionViewModel::class.java) ->
                CreateTransactionViewModel(apiClient) as T
            modelClass.isAssignableFrom(CreateTransactionGroupViewModel::class.java) ->
                CreateTransactionGroupViewModel(apiClient) as T
            else -> throw IllegalArgumentException("Unknown ViewModel: ${modelClass.name}")
        }
    }
}
