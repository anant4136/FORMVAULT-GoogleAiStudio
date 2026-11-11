package com.formvault.android

import android.app.Application
import com.formvault.android.ads.AdsProvider
import com.formvault.android.ads.NoAdsProvider
import com.formvault.android.data.local.database.FormVaultDatabase
import com.formvault.android.data.local.preferences.FormVaultPreferences
import com.formvault.android.data.local.storage.StorageManager
import com.formvault.android.data.repository.OfflineDocumentRepository
import com.formvault.android.domain.repository.DocumentRepository

class FormVaultApplication : Application() {

    lateinit var database: FormVaultDatabase
        private set

    lateinit var storageManager: StorageManager
        private set

    lateinit var preferences: FormVaultPreferences
        private set

    lateinit var documentRepository: DocumentRepository
        private set

    lateinit var adsProvider: AdsProvider
        private set

    override fun onCreate() {
        super.onCreate()
        
        // Offline-first core services initialization
        database = FormVaultDatabase.getInstance(this)
        storageManager = StorageManager(this)
        preferences = FormVaultPreferences(this)
        
        // Zero-ads privacy-first provider
        adsProvider = NoAdsProvider()

        documentRepository = OfflineDocumentRepository(
            documentDao = database.documentDao(),
            profileDao = database.profileDao(),
            storageManager = storageManager
        )
    }
}
