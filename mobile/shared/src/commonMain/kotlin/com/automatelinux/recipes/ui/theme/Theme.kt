package com.automatelinux.recipes.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Tokens: warm paper and ink, terracotta for the one action that matters ──
val Paper = Color(0xFFFBF7EF)
val Card = Color(0xFFFFFFFF)
val Ink = Color(0xFF2A211A)
val Muted = Color(0xFF7A6A5A)
val Line = Color(0xFFE8DFD0)
val Terracotta = Color(0xFFC2622E)
val TerracottaDeep = Color(0xFFA24E20)
val TerracottaSoft = Color(0xFFF7E3D3)
val Amber = Color(0xFFF5B548)
val Dark = Color(0xFF1C1612)
val DarkInk = Color(0xFFFBF7EF)
val DarkMuted = Color(0xFFD9CFBF)
val Danger = Color(0xFF9B1C1C)

private val Colors = lightColorScheme(
    primary = Terracotta,
    onPrimary = Color.White,
    primaryContainer = TerracottaSoft,
    onPrimaryContainer = TerracottaDeep,
    secondary = Amber,
    background = Paper,
    onBackground = Ink,
    surface = Card,
    onSurface = Ink,
    surfaceVariant = Paper,
    onSurfaceVariant = Muted,
    outline = Line,
    error = Danger,
)

fun typography(font: FontFamily): Typography {
    val base = Typography()
    fun TextStyle.f(weight: FontWeight = FontWeight.Normal) = copy(fontFamily = font, fontWeight = weight)
    return Typography(
        displaySmall = base.displaySmall.f(FontWeight.Bold).copy(fontSize = 34.sp, lineHeight = 38.sp),
        headlineMedium = base.headlineMedium.f(FontWeight.Bold).copy(fontSize = 26.sp, lineHeight = 30.sp),
        titleLarge = base.titleLarge.f(FontWeight.SemiBold).copy(fontSize = 20.sp, lineHeight = 26.sp),
        titleMedium = base.titleMedium.f(FontWeight.SemiBold).copy(fontSize = 17.sp, lineHeight = 22.sp),
        bodyLarge = base.bodyLarge.f().copy(fontSize = 17.sp, lineHeight = 25.sp),
        bodyMedium = base.bodyMedium.f().copy(fontSize = 15.sp, lineHeight = 22.sp),
        labelLarge = base.labelLarge.f(FontWeight.SemiBold).copy(fontSize = 15.sp),
        labelMedium = base.labelMedium.f(FontWeight.SemiBold).copy(fontSize = 12.sp, letterSpacing = 1.6.sp),
        labelSmall = base.labelSmall.f(FontWeight.Medium).copy(fontSize = 12.sp),
    )
}

// Multiplatform theme (no Android-only dynamic color, so it compiles for iOS too).
@Composable
fun AppTheme(font: FontFamily = FontFamily.Default, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, typography = typography(font), content = content)
}
