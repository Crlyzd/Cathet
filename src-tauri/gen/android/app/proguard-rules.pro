# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve Cathet JNI native methods and helper classes
-keepclassmembers class com.cathet.app.MainActivity {
    native <methods>;
}

-keep class com.cathet.app.FileHelper {
    public static *;
}

-keep class com.cathet.app.RustWebView {
    public *;
}
