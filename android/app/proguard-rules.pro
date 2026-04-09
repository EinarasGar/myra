# Disable obfuscation — keep minification and optimization
# Source is open, and readable crash logs are more valuable
-dontobfuscate

# Keep JNA classes used by UniFFI bindings
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-dontwarn java.awt.**

# Keep UniFFI generated bindings
-keep class uniffi.** { *; }

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
