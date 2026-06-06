# Disable obfuscation — keep minification and optimization
# Source is open, and readable crash logs are more valuable
-dontobfuscate

# Keep JNA classes used by UniFFI bindings
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-dontwarn java.awt.**

# Keep UniFFI generated bindings
-keep class uniffi.** { *; }

# Lucide icon picker enumerates icons by reflecting over the library's R drawable
# class and resolves them by name via Resources.getIdentifier (core/icons/LucideIcon.kt).
# R8 can't see these dynamic references, so without this the fields are stripped and
# the picker is empty in release builds.
-keep class com.composables.icons.lucide.R$drawable { *; }

# OkHttp
-dontwarn okhttp3.internal.**

# Room (used by Clerk SDK via WorkManager)
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }

# WorkManager (used by Clerk SDK)
-keep class androidx.work.** { *; }

# Clerk SDK
-keep class com.clerk.** { *; }
-dontwarn com.clerk.**

# Kotlin serialization (used by Clerk)
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}
