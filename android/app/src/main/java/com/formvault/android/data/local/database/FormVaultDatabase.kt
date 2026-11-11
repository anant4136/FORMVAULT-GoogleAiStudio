package com.formvault.android.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.formvault.android.core.util.Constants
import com.formvault.android.data.local.database.dao.DocumentDao
import com.formvault.android.data.local.database.dao.ProfileDao
import com.formvault.android.data.local.database.entity.DocumentEntity
import com.formvault.android.data.local.database.entity.DocumentVersionEntity
import com.formvault.android.data.local.database.entity.ProfileEntity

@Database(
    entities = [
        DocumentEntity::class,
        DocumentVersionEntity::class,
        ProfileEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class FormVaultDatabase : RoomDatabase() {

    abstract fun documentDao(): DocumentDao
    abstract fun profileDao(): ProfileDao

    companion object {
        @Volatile
        private var INSTANCE: FormVaultDatabase? = null

        fun getInstance(context: Context): FormVaultDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FormVaultDatabase::class.java,
                    Constants.DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
