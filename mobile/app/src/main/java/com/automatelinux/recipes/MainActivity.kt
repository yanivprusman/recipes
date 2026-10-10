package com.automatelinux.recipes

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.automatelinux.recipes.ui.feedback.FeedbackHost
import com.automatelinux.recipes.util.ScreenTracker
import dagger.hilt.android.AndroidEntryPoint

// Thin Android launcher — all UI lives in the shared commonMain App() composable.
// @AndroidEntryPoint: feedback-lib's overlay (dev flavor) resolves Hilt view models here.
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Light paper screens by default; step mode is dark and sets its own bars.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        setContent {
            FeedbackHost {
                App(
                    baseUrl = BuildConfig.API_BASE_URL,
                    fontFamily = Heebo,
                    dockBottom = if (BuildConfig.FLAVOR == "dev") 58.dp else 12.dp,
                    onScreen = { ScreenTracker.currentScreen = it },
                )
            }
        }
    }
}

@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun heebo(weight: Int) = Font(
    R.font.heebo,
    FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

/** Heebo, bundled: one face for Hebrew and Latin at every weight the UI uses. */
private val Heebo = FontFamily(heebo(400), heebo(500), heebo(600), heebo(700), heebo(800))
