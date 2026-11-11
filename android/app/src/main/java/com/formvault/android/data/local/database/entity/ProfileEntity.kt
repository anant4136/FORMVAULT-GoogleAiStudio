package com.formvault.android.data.local.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.formvault.android.domain.model.ApplicationProfile
import com.formvault.android.domain.model.DocumentCategory

@Entity(tableName = "application_profiles")
data class ProfileEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val description: String,
    val targetOrganization: String,
    val deadline: Long?,
    val documentIdsCsv: String,
    val requiredCategoriesCsv: String,
    val createdAt: Long
) {
    fun toDomain(): ApplicationProfile {
        return ApplicationProfile(
            id = id,
            title = title,
            description = description,
            targetOrganization = targetOrganization,
            deadline = deadline,
            documentIds = if (documentIdsCsv.isBlank()) emptyList() else documentIdsCsv.split(",").map { it.trim() },
            requiredCategories = if (requiredCategoriesCsv.isBlank()) emptyList() else requiredCategoriesCsv.split(",").mapNotNull {
                try { DocumentCategory.valueOf(it.trim()) } catch (_: Exception) { null }
            },
            createdAt = createdAt
        )
    }

    companion object {
        fun fromDomain(profile: ApplicationProfile): ProfileEntity {
            return ProfileEntity(
                id = profile.id,
                title = profile.title,
                description = profile.description,
                targetOrganization = profile.targetOrganization,
                deadline = profile.deadline,
                documentIdsCsv = profile.documentIds.joinToString(","),
                requiredCategoriesCsv = profile.requiredCategories.joinToString(",") { it.name },
                createdAt = profile.createdAt
            )
        }
    }
}
