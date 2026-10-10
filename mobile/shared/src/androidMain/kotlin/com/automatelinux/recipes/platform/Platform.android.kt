package com.automatelinux.recipes.platform

import android.content.res.Configuration
import android.media.MediaPlayer
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.SeekParameters
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import java.util.Locale

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) = BackHandler(enabled, onBack)

@Composable
actual fun RemoteImage(url: String?, modifier: Modifier, contentScale: ContentScale, alpha: Float) {
    if (url == null) return
    AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = contentScale, alpha = alpha)
}

@Composable
actual fun Footage(url: String, timeSec: Double, cover: Boolean, modifier: Modifier) {
    val context = LocalContext.current
    val player = remember(url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            // The cut has a keyframe every 0.4 s, so an exact seek decodes a handful of
            // frames: precise enough to track a finger, cheap enough to do every frame.
            setSeekParameters(SeekParameters.EXACT)
            playWhenReady = false
            prepare()
        }
    }
    DisposableEffect(player) { onDispose { player.release() } }
    LaunchedEffect(player, timeSec) {
        player.seekTo((timeSec * 1000).toLong())
    }
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            PlayerView(ctx).apply {
                useController = false
                setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                resizeMode = if (cover) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
                this.player = player
            }
        },
        update = { view ->
            view.player = player
            view.resizeMode = if (cover) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
        },
    )
}

private class AndroidNarrator : Narrator {
    private var mp: MediaPlayer? = null
    override var playing: String? by mutableStateOf(null)

    override fun toggle(url: String) {
        if (playing == url) { stop(); return }
        play(url)
    }

    override fun play(url: String) {
        stop()
        val p = MediaPlayer()
        runCatching {
            // Media usage: the volume keys adjust it and it ducks like any other playback.
            p.setAudioAttributes(
                android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build(),
            )
            p.setDataSource(url)
            p.setOnPreparedListener { it.start(); playing = url }
            p.setOnCompletionListener { stop() }
            p.setOnErrorListener { _, _, _ -> stop(); true }
            p.prepareAsync()
            mp = p
        }.onFailure { p.release() }
    }

    override fun stop() {
        mp?.let { runCatching { it.stop() }; it.release() }
        mp = null
        playing = null
    }
}

@Composable
actual fun rememberNarrator(): Narrator {
    val n = remember { AndroidNarrator() }
    DisposableEffect(n) { onDispose { n.stop() } }
    return n
}

@Composable
actual fun KeepScreenOn() {
    val view = LocalView.current
    DisposableEffect(view) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }
}

actual fun platformLanguage(): String = Locale.getDefault().language

@Composable
actual fun rememberBoolPref(key: String, default: Boolean): androidx.compose.runtime.MutableState<Boolean> {
    val context = LocalContext.current
    val prefs = remember(context) { context.getSharedPreferences("recipes", android.content.Context.MODE_PRIVATE) }
    val state = remember(key) { mutableStateOf(prefs.getBoolean(key, default)) }
    LaunchedEffect(state.value) { prefs.edit().putBoolean(key, state.value).apply() }
    return state
}

@Composable
actual fun isLandscape(): Boolean = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
