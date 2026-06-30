package com.sverto.app.core

import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.MutableCreationExtras
import androidx.test.core.app.ApplicationProvider
import com.sverto.app.SvertoApp
import com.sverto.app.feature.assets.AssetOverviewViewModel
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SvertoViewModelFactoryTest {
    @Test
    fun createsAssetOverviewViewModel() {
        val app = ApplicationProvider.getApplicationContext<SvertoApp>()
        val extras =
            MutableCreationExtras().apply {
                set(ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY, app)
            }

        val viewModel = SvertoViewModelFactory.create(AssetOverviewViewModel::class.java, extras)

        assertNotNull(viewModel)
        assertTrue(viewModel is AssetOverviewViewModel)
    }
}
