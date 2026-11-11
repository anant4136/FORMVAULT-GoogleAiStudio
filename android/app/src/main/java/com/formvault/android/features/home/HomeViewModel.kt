package com.formvault.android.features.home

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.formvault.android.core.result.Resource
import com.formvault.android.domain.model.ApplicationProfile
import com.formvault.android.domain.model.Document
import com.formvault.android.domain.model.DocumentCategory
import com.formvault.android.domain.repository.DocumentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class HomeUiState(
    val recentDocuments: List<Document> = emptyList(),
    val totalDocumentsCount: Int = 0,
    val profiles: List<ApplicationProfile> = emptyList(),
    val storageBytesUsed: Long = 0L,
    val searchQuery: String = "",
    val searchResults: List<Document> = emptyList(),
    val isImporting: Boolean = false,
    val importMessage: String? = null
)

class HomeViewModel(
    private val repository: DocumentRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _importState = MutableStateFlow<Resource<Document>?>(null)
    val importState = _importState.asStateFlow()

    private val _storageBytes = MutableStateFlow(0L)

    val uiState: StateFlow<HomeUiState> = combine(
        repository.getRecentlyAccessedDocuments(limit = 6),
        repository.getAllDocuments(),
        repository.getAllProfiles(),
        _searchQuery,
        _storageBytes
    ) { recent, allDocs, profiles, query, storage ->
        val results = if (query.isNotBlank()) {
            allDocs.filter { it.title.contains(query, ignoreCase = true) || it.notes.contains(query, ignoreCase = true) }
        } else {
            emptyList()
        }

        HomeUiState(
            recentDocuments = recent,
            totalDocumentsCount = allDocs.size,
            profiles = profiles,
            storageBytesUsed = storage,
            searchQuery = query,
            searchResults = results
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState()
    )

    init {
        refreshStorageUsage()
    }

    fun onSearchQueryChanged(newQuery: String) {
        _searchQuery.value = newQuery
    }

    fun refreshStorageUsage() {
        viewModelScope.launch {
            _storageBytes.value = repository.getStorageUsageBytes()
        }
    }

    fun importDocument(uri: Uri, title: String, category: DocumentCategory) {
        viewModelScope.launch {
            _importState.value = Resource.Loading
            val result = repository.importDocument(uri, title, category)
            _importState.value = result
            refreshStorageUsage()
        }
    }

    fun clearImportMessage() {
        _importState.value = null
    }
}
