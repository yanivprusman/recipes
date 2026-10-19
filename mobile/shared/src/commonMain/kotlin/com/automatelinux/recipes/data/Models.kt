package com.automatelinux.recipes.data

import kotlinx.serialization.Serializable

// Mirrors lib/recipe-media.ts + lib/recipes.ts in the web app (the JSON the routes return).

@Serializable
data class Ingredient(val name: String, val quantity: String = "")

@Serializable
data class RecipeYield(val amount: Double, val unit: String)

/** Site-relative photo paths; `steps` is index-aligned with Recipe.steps (null = none). */
@Serializable
data class RecipeImages(
    val cover: String? = null,
    val ingredients: String? = null,
    val steps: List<String?>? = null,
)

/**
 * Text-free footage, scrubbed by the pager position. A segment is [from, to] seconds of
 * the footage; dragging through a slide moves the playhead through its segment.
 */
@Serializable
data class RecipeVideo(
    val src: String,
    val cover: List<Double>? = null,
    val ingredients: List<Double>? = null,
    val steps: List<List<Double>?>? = null,
    val end: List<Double>? = null,
)

/** Spoken narration per slide, played on demand. */
@Serializable
data class RecipeAudio(
    val cover: String? = null,
    val ingredients: String? = null,
    val steps: List<String?>? = null,
)

/**
 * Which language the server put this recipe's words in (the app asks for one with ?lang=),
 * whether that is the language it was written in, and whether the translation is still being
 * made — then some parts are still in the original language and editing waits.
 * [search] is the recipe's name and ingredients in both languages, lowercased.
 */
@Serializable
data class RecipeView(val lang: String, val original: Boolean, val pending: Boolean, val search: String)

@Serializable
data class Recipe(
    val id: String,
    /** The language the recipe was written in. */
    val lang: String,
    val view: RecipeView,
    val name: String,
    val ingredients: List<Ingredient>,
    val steps: List<String>,
    val yield: RecipeYield? = null,
    val images: RecipeImages? = null,
    val video: RecipeVideo? = null,
    val audio: RecipeAudio? = null,
    val createdAt: String = "",
) {
    val isHebrew: Boolean get() = view.lang == "he"
}

@Serializable
data class ErrorBody(val error: String)

/** What the phone sends to create or replace a recipe (media is never edited from here). */
@Serializable
data class RecipeDraft(
    val name: String,
    val ingredients: List<Ingredient>,
    val steps: List<String>,
    val yield: RecipeYield? = null,
)

/** One slide of step mode, built from a recipe: cover, ingredients, every step, the end. */
sealed class Slide(val id: String, val image: String?, val segment: List<Double>?, val audio: String?) {
    class Cover(image: String?, segment: List<Double>?, audio: String?) : Slide("cover", image, segment, audio)
    class Ingredients(image: String?, segment: List<Double>?, audio: String?) : Slide("ingredients", image, segment, audio)
    class Step(val index: Int, val text: String, image: String?, segment: List<Double>?, audio: String?) :
        Slide("step-${index + 1}", image, segment, audio)
    class End(image: String?, segment: List<Double>?) : Slide("end", image, segment, null)
}

fun Recipe.slides(): List<Slide> {
    val stepImages = images?.steps.orEmpty()
    val stepSegs = video?.steps.orEmpty()
    val stepAudio = audio?.steps.orEmpty()
    val lastStepImage = stepImages.lastOrNull { it != null } ?: images?.cover
    return buildList {
        add(Slide.Cover(images?.cover, video?.cover, audio?.cover))
        add(Slide.Ingredients(images?.ingredients, video?.ingredients, audio?.ingredients))
        steps.forEachIndexed { i, text ->
            add(Slide.Step(i, text, stepImages.getOrNull(i), stepSegs.getOrNull(i), stepAudio.getOrNull(i)))
        }
        add(Slide.End(lastStepImage, video?.end))
    }
}

/** "Knead: push, fold, turn" → ("Knead", "push, fold, turn"); presentation only. */
fun splitLead(text: String): Pair<String?, String> {
    val m = Regex("^([^:\\n]{2,40}):\\s+([\\s\\S]+)$").find(text) ?: return null to text
    return m.groupValues[1].trim() to m.groupValues[2].trim()
}

// ── Scaling, ported from RecipeDetail.tsx so the phone shows the same numbers ──

private val mixed = Regex("^(\\d+(?:[.,]\\d+)?)\\s+(\\d+)/(\\d+)")
private val frac = Regex("^(\\d+)/(\\d+)")
private val dec = Regex("^(\\d+(?:[.,]\\d+)?)")

fun parseLeadingNumber(s: String): Pair<Double, String>? {
    mixed.find(s)?.let { m ->
        val den = m.groupValues[3].toInt()
        if (den > 0) return (m.groupValues[1].replace(',', '.').toDouble() + m.groupValues[2].toInt().toDouble() / den) to m.value
    }
    frac.find(s)?.let { m ->
        val den = m.groupValues[2].toInt()
        if (den > 0) return (m.groupValues[1].toInt().toDouble() / den) to m.value
    }
    dec.find(s)?.let { m -> return m.groupValues[1].replace(',', '.').toDouble() to m.groupValues[1] }
    return null
}

fun formatScaled(n: Double): String {
    if (n == kotlin.math.floor(n)) return n.toLong().toString()
    val rounded = kotlin.math.round(n * 100) / 100
    return rounded.toString().trimEnd('0').trimEnd('.')
}

fun scaleQuantity(quantity: String, factor: Double): String {
    if (factor == 1.0) return quantity
    val (value, raw) = parseLeadingNumber(quantity) ?: return quantity
    return quantity.replaceFirst(raw, formatScaled(value * factor))
}

fun scaleStepText(text: String, factor: Double, yieldAmount: Double, yieldUnit: String): String {
    if (factor == 1.0) return text
    val amount = formatScaled(yieldAmount)
    return Regex("($amount)(\\s*${Regex.escape(yieldUnit)})").replace(text) { m ->
        formatScaled(yieldAmount * factor) + m.groupValues[2]
    }
}
