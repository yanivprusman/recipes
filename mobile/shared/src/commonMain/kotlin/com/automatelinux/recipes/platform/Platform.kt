package com.automatelinux.recipes.platform

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale

/** The system back gesture goes up one screen instead of leaving the app. */
@Composable
expect fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit)

/** A photo from the server, cached on disk; [url] null draws nothing. */
@Composable
expect fun RemoteImage(url: String?, modifier: Modifier, contentScale: ContentScale = ContentScale.Crop, alpha: Float = 1f)

/**
 * The text-free footage of step mode, shown at [timeSec] — nothing plays on its own: the
 * pager position is the playhead, every drag seeks. [cover] fills the box (landscape),
 * otherwise the whole frame fits inside it (the 16:9 band on a portrait phone).
 */
@Composable
expect fun Footage(url: String, timeSec: Double, cover: Boolean, modifier: Modifier)

/** Plays one narration clip at a time; [playing] is the url being played, or null. */
interface Narrator {
    val playing: String?
    fun toggle(url: String)
    fun stop()
}

@Composable
expect fun rememberNarrator(): Narrator

/** Keeps the screen on while this composable is on screen (hands are in the dough). */
@Composable
expect fun KeepScreenOn()

/** The phone's UI language code ("he", "en", …). */
expect fun platformLanguage(): String

/** True while the window is wider than it is tall. */
@Composable
expect fun isLandscape(): Boolean
