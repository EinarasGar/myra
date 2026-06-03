package com.sverto.app.core

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.sverto.app.SvertoApp
import com.sverto.app.feature.accounts.AccountDetailViewModel
import com.sverto.app.feature.accounts.AccountTransactionsViewModel
import com.sverto.app.feature.accounts.AccountsViewModel
import com.sverto.app.feature.accounts.AssetDetailViewModel
import com.sverto.app.feature.portfolio.HomeViewModel
import com.sverto.app.feature.transactions.TransactionsViewModel
import com.sverto.app.feature.transactions.create.CreateTransactionViewModel
import com.sverto.app.feature.transactions.group.CreateTransactionGroupViewModel
import com.sverto.app.feature.aichat.AiChatViewModel
import com.sverto.app.feature.transactions.quickupload.QuickUploadViewModel

object SvertoViewModelFactory : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(
        modelClass: Class<T>,
        extras: CreationExtras,
    ): T {
        val app = extras[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as SvertoApp
        val appStore = app.appStore
        return when {
            modelClass.isAssignableFrom(HomeViewModel::class.java) ->
                HomeViewModel(appStore) as T
            modelClass.isAssignableFrom(TransactionsViewModel::class.java) ->
                TransactionsViewModel(appStore) as T
            modelClass.isAssignableFrom(CreateTransactionViewModel::class.java) ->
                CreateTransactionViewModel(appStore) as T
            modelClass.isAssignableFrom(CreateTransactionGroupViewModel::class.java) ->
                CreateTransactionGroupViewModel(appStore) as T
            modelClass.isAssignableFrom(QuickUploadViewModel::class.java) ->
                QuickUploadViewModel(appStore) as T
            modelClass.isAssignableFrom(AccountsViewModel::class.java) ->
                AccountsViewModel(appStore) as T
            modelClass.isAssignableFrom(AccountDetailViewModel::class.java) ->
                AccountDetailViewModel(appStore) as T
            modelClass.isAssignableFrom(AccountTransactionsViewModel::class.java) ->
                AccountTransactionsViewModel(appStore) as T
            modelClass.isAssignableFrom(AssetDetailViewModel::class.java) ->
                AssetDetailViewModel(appStore) as T
            modelClass.isAssignableFrom(AiChatViewModel::class.java) ->
                AiChatViewModel(appStore) as T
            else -> throw IllegalArgumentException("Unknown ViewModel: ${modelClass.name}")
        }
    }
}
