# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in app/build.gradle.kts.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve line numbers for debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name.
-renamesourcefileattribute SourceFile

# --- kotlinx.serialization ---
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-keepclassmembers,includedescriptorclasses class * { @kotlinx.serialization.Serializable <fields>; }
-keep,includedescriptorclasses class **$$serializer { *; }
-keepclassmembers,includedescriptorclasses class **$$serializer { *; }
-keepclasseswithmembers,includedescriptorclasses,includecode class * { kotlinx.serialization.KSerializer serializer(...); }
-keepclasseswithmembers class kotlinx.serialization.internal.** { *; }
-keep,includedescriptorclasses class com.bizflow.cloud.data.remote.** { *; }

# --- Ktor (supabase-kt transporte HTTP) ---
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# --- OkHttp (engine Ktor) ---
-dontwarn okhttp3.**
-dontwarn okio.**