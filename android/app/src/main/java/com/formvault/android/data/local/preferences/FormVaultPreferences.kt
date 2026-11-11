package com.formvault.android.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "formvault_prefs")

class FormVaultPreferences(private val context: Context) {

    companion object {
        val KEY_DARK_THEME = booleanPreferencesKey("pref_dark_theme")
        val KEY_ONBOARDING_COMPLETED = booleanPreferencesKey("pref_onboarding_completed")
        val KEY_DEFAULT_VIEW_MODE = stringPreferencesKey("pref_vault_view_mode") // "grid" or "list"
        val KEY_AUTO_CLEAN_TEMP = booleanPreferencesKey("pref_auto_clean_temp")
    }

    val isDarkThemeFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[KEY_DARK_THEME] ?: false
    }

    val isOnboardingCompletedFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[KEY_ONBOARDING_COMPLETED] ?: false
    }

    val defaultViewModeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_DEFAULT_VIEW_MODE] ?: "grid"
    }

    suspend fun setDarkTheme(enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DARK_THEME] = enabled
        }
    }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[KEY_ONBOARDING_COMPLETED] = completed
        }
    }

    suspend fun setDefaultViewMode(mode: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DEFAULT_VIEW_MODE] = mode
        }
    }
}
