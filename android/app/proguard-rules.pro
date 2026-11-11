# FormVault ProGuard / R8 Rules for Release Build

# Keep Room Database entities and DAOs
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Keep Domain models
-keep class com.formvault.android.domain.model.** { *; }
-keep class com.formvault.android.data.local.database.entity.** { *; }

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# Compose Runtime
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}
