package com.automatelinux.recipes

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.automatelinux.recipes.data.*
import com.automatelinux.recipes.platform.*
import com.automatelinux.recipes.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ── Strings: the chrome follows the phone's language; recipe text keeps its own ──
class Str(val he: Boolean) {
    val recipes = if (he) "מתכונים" else "Recipes"
    val search = if (he) "חיפוש לפי שם או מצרך" else "Search by name or ingredient"
    val noRecipes = if (he) "אין עדיין מתכונים. הוסיפו את הראשון." else "No recipes yet. Add your first one."
    val noMatch = if (he) "אין מתכון שמתאים לחיפוש." else "No recipe matches."
    val ingredientsN = { n: Int -> if (he) "$n מצרכים" else "$n ingredient" + (if (n == 1) "" else "s") }
    val stepsN = { n: Int -> if (he) "$n שלבים" else "$n step" + (if (n == 1) "" else "s") }
    val ingredients = if (he) "מצרכים" else "Ingredients"
    val preparation = if (he) "הכנה" else "Preparation"
    val yieldLabel = if (he) "תפוקה" else "Yield"
    val scale = if (he) "שינוי כמות" else "Scale"
    val portions = if (he) "מנות" else "Portions"
    val percent = if (he) "אחוזים" else "Percent"
    val reset = if (he) "איפוס" else "Reset"
    val stepByStep = if (he) "שלב אחר שלב" else "Step by step"
    val edit = if (he) "עריכה" else "Edit"
    val delete = if (he) "מחיקת מתכון" else "Delete recipe"
    val confirmDelete = if (he) "למחוק את המתכון לצמיתות?" else "Delete this recipe permanently?"
    val confirmYes = if (he) "מחק" else "Delete"
    val cancel = if (he) "ביטול" else "Cancel"
    val save = if (he) "שמירה" else "Save"
    val newRecipe = if (he) "מתכון חדש" else "New recipe"
    val name = if (he) "שם המתכון" else "Recipe name"
    val quantity = if (he) "כמות" else "Qty"
    val ingredient = if (he) "מצרך" else "Ingredient"
    val addIngredient = if (he) "הוספת מצרך" else "Add ingredient"
    val step = if (he) "שלב" else "Step"
    val addStep = if (he) "הוספת שלב" else "Add step"
    val yieldAmount = if (he) "כמות" else "Amount"
    val yieldUnit = if (he) "יחידה (מנות, כדורים…)" else "Unit (portions, balls…)"
    val of = if (he) "מתוך" else "of"
    val scroll = if (he) "גללו" else "Scroll"
    val done = if (he) "בתיאבון!" else "Enjoy!"
    val startOver = if (he) "מההתחלה" else "Start over"
    val backToRecipe = if (he) "חזרה למתכון" else "Back to the recipe"
    val recipe = if (he) "למתכון" else "Recipe"
    val listen = if (he) "השמעה" else "Listen"
    val stop = if (he) "עצירה" else "Stop"
    val narrationOn = if (he) "קריינות פועלת" else "Narration on"
    val narrationOff = if (he) "קריינות כבויה" else "Narration off"
    val retry = if (he) "נסו שוב" else "Try again"
    val needed = if (he) "צריך שם, מצרך אחד ושלב אחד לפחות." else "A name, one ingredient and one step are needed."
    val saving = if (he) "שומר…" else "Saving…"
}

private val LocalStr = staticCompositionLocalOf<Str> { error("no strings") }
private val LocalApi = staticCompositionLocalOf<RecipesApi> { error("no api") }

// ── Navigation: a stack of screens, back pops ──
private sealed class Nav {
    data object List : Nav()
    data class Detail(val id: String) : Nav()
    data class Steps(val id: String) : Nav()
    data class Edit(val id: String?) : Nav()
}

/** Everything the app knows: the list from the server, and how the last load went. */
private class Store(private val api: RecipesApi) {
    var recipes by mutableStateOf<List<Recipe>>(emptyList())
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var loaded by mutableStateOf(false)

    suspend fun refresh() {
        loading = true
        when (val r = api.list()) {
            is Result.Ok -> { recipes = r.value; error = null; loaded = true }
            is Result.Err -> error = r.message
        }
        loading = false
    }

    fun byId(id: String) = recipes.firstOrNull { it.id == id }
}

@Composable
fun App(
    baseUrl: String,
    fontFamily: FontFamily = FontFamily.Default,
    dockBottom: Dp = 12.dp,
    onScreen: (String) -> Unit = {},
) {
    val he = platformLanguage() == "he" || platformLanguage() == "iw"
    val str = remember(he) { Str(he) }
    val api = remember(baseUrl, he) { RecipesApi(baseUrl, he) }
    val store = remember(api) { Store(api) }
    val stack = remember { mutableStateListOf<Nav>(Nav.List) }
    val scope = rememberCoroutineScope()
    val top = stack.last()

    LaunchedEffect(Unit) { store.refresh() }
    LaunchedEffect(top) {
        onScreen(
            when (top) {
                Nav.List -> "recipes"
                is Nav.Detail -> "recipe"
                is Nav.Steps -> "step mode"
                is Nav.Edit -> "editor"
            },
        )
    }
    PlatformBackHandler(enabled = stack.size > 1) { stack.removeAt(stack.lastIndex) }

    CompositionLocalProvider(
        LocalStr provides str,
        LocalApi provides api,
        LocalLayoutDirection provides if (he) LayoutDirection.Rtl else LayoutDirection.Ltr,
    ) {
        AppTheme(fontFamily) {
            Surface(Modifier.fillMaxSize(), color = Paper) {
                when (top) {
                    Nav.List -> ListScreen(
                        store = store,
                        dockBottom = dockBottom,
                        onOpen = { stack.add(Nav.Detail(it)) },
                        onAdd = { stack.add(Nav.Edit(null)) },
                        onRefresh = { scope.launch { store.refresh() } },
                    )
                    is Nav.Detail -> {
                        val recipe = store.byId(top.id)
                        if (recipe == null) {
                            LaunchedEffect(top.id) { if (store.loaded) stack.removeAt(stack.lastIndex) }
                            Centered { CircularProgressIndicator(color = Terracotta) }
                        } else {
                            DetailScreen(
                                recipe = recipe,
                                dockBottom = dockBottom,
                                onBack = { stack.removeAt(stack.lastIndex) },
                                onSteps = { stack.add(Nav.Steps(recipe.id)) },
                                onEdit = { stack.add(Nav.Edit(recipe.id)) },
                                onDeleted = { scope.launch { store.refresh(); stack.removeAt(stack.lastIndex) } },
                            )
                        }
                    }
                    is Nav.Steps -> {
                        val recipe = store.byId(top.id)
                        if (recipe != null) StepsScreen(recipe, onBack = { stack.removeAt(stack.lastIndex) })
                    }
                    is Nav.Edit -> EditScreen(
                        recipe = top.id?.let { store.byId(it) },
                        onBack = { stack.removeAt(stack.lastIndex) },
                        onSaved = { saved ->
                            scope.launch {
                                store.refresh()
                                stack.removeAt(stack.lastIndex)
                                if (top.id == null) stack.add(Nav.Detail(saved.id))
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
}

/** The recipe's own direction: a Hebrew recipe reads right-to-left whatever the phone's language. */
@Composable
private fun RecipeDirection(recipe: Recipe, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalLayoutDirection provides if (recipe.isHebrew) LayoutDirection.Rtl else LayoutDirection.Ltr, content = content)
}

// ── List ──────────────────────────────────────────────────────────────────────

@Composable
private fun ListScreen(store: Store, dockBottom: Dp, onOpen: (String) -> Unit, onAdd: () -> Unit, onRefresh: () -> Unit) {
    val str = LocalStr.current
    val api = LocalApi.current
    var query by remember { mutableStateOf("") }
    val q = query.trim().lowercase()
    val shown = remember(store.recipes, q) {
        if (q.isEmpty()) store.recipes
        else store.recipes.filter { r -> r.name.lowercase().contains(q) || r.ingredients.any { it.name.lowercase().contains(q) } }
    }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = WindowInsets.safeDrawing.asPaddingValues().let {
                PaddingValues(top = it.calculateTopPadding() + 12.dp, bottom = it.calculateBottomPadding() + dockBottom + 88.dp, start = 20.dp, end = 20.dp)
            },
        ) {
            item {
                Row(Modifier.fillMaxWidth().padding(bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(str.recipes, style = MaterialTheme.typography.displaySmall, color = Ink, modifier = Modifier.weight(1f))
                    IconButton(onClick = onRefresh, enabled = !store.loading) {
                        if (store.loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Terracotta)
                        else Icon(Icons.Default.Refresh, contentDescription = null, tint = Muted)
                    }
                }
            }
            item {
                SearchField(query, { query = it }, str.search)
                Spacer(Modifier.height(16.dp))
            }
            store.error?.let { err ->
                item { ErrorCard(err, onRetry = onRefresh); Spacer(Modifier.height(12.dp)) }
            }
            if (store.loaded && shown.isEmpty()) {
                item { Text(if (q.isEmpty()) str.noRecipes else str.noMatch, color = Muted, style = MaterialTheme.typography.bodyLarge) }
            }
            items(shown, key = { it.id }) { r ->
                RecipeCard(r, api, str, onClick = { onOpen(r.id) })
                Spacer(Modifier.height(10.dp))
            }
        }
        FloatingActionButton(
            onClick = onAdd,
            containerColor = Terracotta,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 20.dp, bottom = dockBottom + 20.dp).windowInsetsPadding(WindowInsets.navigationBars),
        ) { Icon(Icons.Default.Add, contentDescription = str.newRecipe) }
    }
}

@Composable
private fun SearchField(value: String, onChange: (String) -> Unit, hint: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        placeholder = { Text(hint, color = Muted) },
        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Muted) },
        trailingIcon = if (value.isNotEmpty()) ({ IconButton({ onChange("") }) { Icon(Icons.Default.Close, null, tint = Muted) } }) else null,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Card, unfocusedContainerColor = Card,
            focusedBorderColor = Terracotta, unfocusedBorderColor = Line,
        ),
    )
}

@Composable
private fun RecipeCard(r: Recipe, api: RecipesApi, str: Str, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Card).border(1.dp, Line, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RecipeDirection(r) {
            Column(Modifier.weight(1f)) {
                Text(r.name, style = MaterialTheme.typography.titleLarge, color = Ink, textAlign = TextAlign.Start, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(4.dp))
                Text("${str.ingredientsN(r.ingredients.size)} · ${str.stepsN(r.steps.size)}", style = MaterialTheme.typography.bodyMedium, color = Muted, modifier = Modifier.fillMaxWidth())
            }
        }
        api.url(r.images?.cover)?.let {
            Spacer(Modifier.width(14.dp))
            RemoteImage(it, Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)))
        }
    }
}

@Composable
private fun ErrorCard(message: String, onRetry: () -> Unit) {
    val str = LocalStr.current
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(TerracottaSoft).padding(14.dp)) {
        Text(message, color = TerracottaDeep, style = MaterialTheme.typography.bodyMedium)
        TextButton(onClick = onRetry, contentPadding = PaddingValues(0.dp)) { Text(str.retry, color = TerracottaDeep, fontWeight = FontWeight.SemiBold) }
    }
}

// ── Detail ────────────────────────────────────────────────────────────────────

@Composable
private fun DetailScreen(recipe: Recipe, dockBottom: Dp, onBack: () -> Unit, onSteps: () -> Unit, onEdit: () -> Unit, onDeleted: () -> Unit) {
    val str = LocalStr.current
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var menu by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }
    val checked = remember(recipe.id) { mutableStateListOf<Int>() }
    val done = remember(recipe.id) { mutableStateListOf<Int>() }
    var percentMode by remember(recipe.id) { mutableStateOf(false) }
    var scaleInput by remember(recipe.id) { mutableStateOf(recipe.yield?.let { formatScaled(it.amount) } ?: "100") }
    val factor = run {
        val v = scaleInput.replace(',', '.').toDoubleOrNull()
        when {
            v == null || v <= 0 -> 1.0
            percentMode -> v / 100
            recipe.yield != null -> v / recipe.yield.amount
            else -> 1.0
        }
    }
    val cover = api.url(recipe.images?.cover)

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            // hero: the cover photo with the bar over it (or the bar alone on paper); it
            // scrolls away with the page — the system back gesture is always there.
            Box(Modifier.fillMaxWidth().then(if (cover != null) Modifier.aspectRatio(16f / 10f) else Modifier)) {
                if (cover != null) {
                    RemoteImage(cover, Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color.Black.copy(alpha = 0.35f), 0.4f to Color.Transparent)))
                }
                Row(
                    Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Pill(onClick = onBack, dark = cover != null) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = str.recipes, modifier = Modifier.size(20.dp)) }
                    Box {
                        Pill(onClick = { menu = true }, dark = cover != null) { Icon(Icons.Default.MoreVert, contentDescription = null, modifier = Modifier.size(20.dp)) }
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                            DropdownMenuItem(text = { Text(str.edit) }, leadingIcon = { Icon(Icons.Default.Edit, null) }, onClick = { menu = false; onEdit() })
                            DropdownMenuItem(text = { Text(str.delete, color = Danger) }, leadingIcon = { Icon(Icons.Default.Delete, null, tint = Danger) }, onClick = { menu = false; confirm = true })
                        }
                    }
                }
            }
            RecipeDirection(recipe) {
                Column(Modifier.padding(horizontal = 20.dp)) {
                    Spacer(Modifier.height(18.dp))
                    Text(recipe.name, style = MaterialTheme.typography.headlineMedium, color = Ink, modifier = Modifier.fillMaxWidth())
                    recipe.yield?.let { y ->
                        Spacer(Modifier.height(14.dp))
                        ScaleRow(y, percentMode, scaleInput, factor, onMode = { percentMode = it; scaleInput = if (it) "100" else formatScaled(y.amount) }, onInput = { scaleInput = it }, onReset = { scaleInput = if (percentMode) "100" else formatScaled(y.amount) })
                    }
                    Spacer(Modifier.height(26.dp))
                    SectionTitle(str.ingredients)
                    recipe.ingredients.forEachIndexed { i, ing ->
                        val on = i in checked
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { if (on) checked.remove(i) else checked.add(i) }.padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Dot(on)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                buildString { append(scaleQuantity(ing.quantity, factor)); if (ing.quantity.isNotBlank()) append(' '); append(ing.name) },
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (on) Muted else Ink,
                                textDecoration = if (on) TextDecoration.LineThrough else null,
                            )
                        }
                    }
                    Spacer(Modifier.height(26.dp))
                    SectionTitle(str.preparation)
                    recipe.steps.forEachIndexed { i, s ->
                        val on = i in done
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { if (on) done.remove(i) else done.add(i) }.padding(vertical = 10.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Text("${i + 1}.", style = MaterialTheme.typography.titleMedium, color = if (on) Line else Terracotta, modifier = Modifier.width(30.dp))
                            Text(
                                recipe.yield?.let { scaleStepText(s, factor, it.amount, it.unit) } ?: s,
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (on) Muted else Ink,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                    deleteError?.let { Spacer(Modifier.height(12.dp)); ErrorCard(it) { deleteError = null } }
                    Spacer(Modifier.height(120.dp + dockBottom))
                }
            }
        }

        // the one big action
        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Brush.verticalGradient(0f to Paper.copy(alpha = 0f), 0.5f to Paper)).padding(horizontal = 20.dp).padding(top = 28.dp, bottom = dockBottom + 16.dp).windowInsetsPadding(WindowInsets.navigationBars)) {
            Button(
                onClick = onSteps,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Terracotta, contentColor = Color.White),
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(str.stepByStep, style = MaterialTheme.typography.titleMedium)
            }
        }
    }

    if (confirm) {
        AlertDialog(
            onDismissRequest = { if (!deleting) confirm = false },
            title = { Text(recipe.name) },
            text = { Text(str.confirmDelete) },
            confirmButton = {
                TextButton(
                    enabled = !deleting,
                    onClick = {
                        deleting = true
                        scope.launch {
                            when (val r = api.delete(recipe.id)) {
                                is Result.Ok -> { confirm = false; onDeleted() }
                                is Result.Err -> { deleteError = r.message; confirm = false }
                            }
                            deleting = false
                        }
                    },
                ) { Text(str.confirmYes, color = Danger, fontWeight = FontWeight.SemiBold) }
            },
            dismissButton = { TextButton(enabled = !deleting, onClick = { confirm = false }) { Text(str.cancel) } },
            containerColor = Card,
        )
    }
}

@Composable
private fun Pill(onClick: () -> Unit, dark: Boolean, content: @Composable () -> Unit) {
    Box(
        Modifier.size(40.dp).clip(CircleShape).background(if (dark) Color.Black.copy(alpha = 0.35f) else Card)
            .border(1.dp, if (dark) Color.White.copy(alpha = 0.25f) else Line, CircleShape).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        CompositionLocalProvider(LocalContentColor provides if (dark) Color.White else Ink) { content() }
    }
}

@Composable
private fun SectionTitle(t: String) {
    Text(t.uppercase(), style = MaterialTheme.typography.labelMedium, color = Terracotta, modifier = Modifier.padding(bottom = 8.dp))
}

@Composable
private fun Dot(on: Boolean) {
    Box(
        Modifier.size(20.dp).clip(CircleShape).background(if (on) Terracotta else Card).border(1.5.dp, if (on) Terracotta else Line, CircleShape),
        contentAlignment = Alignment.Center,
    ) { if (on) Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(13.dp)) }
}

@Composable
private fun ScaleRow(y: RecipeYield, percentMode: Boolean, input: String, factor: Double, onMode: (Boolean) -> Unit, onInput: (String) -> Unit, onReset: () -> Unit) {
    val str = LocalStr.current
    Column {
        Text("${str.yieldLabel}: ${formatScaled(y.amount)} ${y.unit}", style = MaterialTheme.typography.bodyMedium, color = Muted)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Segmented(listOf(str.portions, str.percent), if (percentMode) 1 else 0) { onMode(it == 1) }
            OutlinedTextField(
                value = input,
                onValueChange = onInput,
                modifier = Modifier.width(84.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                textStyle = MaterialTheme.typography.bodyMedium.copy(textAlign = TextAlign.Center),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Terracotta, unfocusedBorderColor = Line, focusedContainerColor = Card, unfocusedContainerColor = Card),
            )
            Text(if (percentMode) "%" else y.unit, color = Muted, style = MaterialTheme.typography.bodyMedium)
            if (factor != 1.0) {
                Text("×${formatScaled(factor)}", color = Muted, style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = onReset, contentPadding = PaddingValues(horizontal = 6.dp)) { Text(str.reset, color = Terracotta) }
            }
        }
    }
}

@Composable
private fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(Modifier.clip(RoundedCornerShape(10.dp)).background(Card).border(1.dp, Line, RoundedCornerShape(10.dp)).padding(3.dp)) {
        options.forEachIndexed { i, o ->
            val on = i == selected
            Box(
                Modifier.clip(RoundedCornerShape(8.dp)).background(if (on) Ink else Color.Transparent).clickable { onSelect(i) }.padding(horizontal = 12.dp, vertical = 6.dp),
            ) { Text(o, color = if (on) Paper else Muted, style = MaterialTheme.typography.labelLarge) }
        }
    }
}

// ── Step mode: one page per slide, the footage scrubbed by the drag ──────────

@Composable
private fun StepsScreen(recipe: Recipe, onBack: () -> Unit) {
    val str = LocalStr.current
    val api = LocalApi.current
    val slides = remember(recipe) { recipe.slides() }
    val pager = rememberPagerState(pageCount = { slides.size })
    val scope = rememberCoroutineScope()
    val narrator = rememberNarrator()
    val landscape = isLandscape()
    KeepScreenOn()

    // The drag position IS the playhead: page + fraction walks through that slide's segment.
    val pos = pager.currentPage + pager.currentPageOffsetFraction
    var playhead by remember { mutableStateOf(slides.firstOrNull()?.segment?.get(0) ?: 0.0) }
    LaunchedEffect(pos) {
        val i = pos.toInt().coerceIn(0, slides.lastIndex)
        val f = (pos - i).coerceIn(0f, 1f).toDouble()
        slides[i].segment?.let { seg -> playhead = seg[0] + f * (seg[1] - seg[0]) }
    }
    // Narration plays on its own once a page has settled (a drag straight through stays
    // quiet); the speaker in the bar turns it off, and that choice is remembered.
    var auto by rememberBoolPref("narrate", true)
    LaunchedEffect(pager.settledPage, auto) {
        narrator.stop()
        if (!auto) return@LaunchedEffect
        val url = api.url(slides[pager.settledPage].audio) ?: return@LaunchedEffect
        delay(450)
        narrator.play(url)
    }
    val video = api.url(recipe.video?.src)
    val coverImage = api.url(recipe.images?.cover)
    val topBar = 56.dp

    RecipeDirection(recipe) {
        Box(Modifier.fillMaxSize().background(Dark)) {
            // stage: blurred cover behind everything, footage over it
            if (video != null) {
                if (coverImage != null && !landscape) RemoteImage(coverImage, Modifier.fillMaxSize().blur(36.dp).alpha(0.45f))
                Footage(
                    url = video,
                    timeSec = playhead,
                    cover = landscape,
                    modifier = if (landscape) Modifier.fillMaxSize()
                    else Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(top = topBar).aspectRatio(16f / 9f),
                )
            }

            VerticalPager(state = pager, modifier = Modifier.fillMaxSize(), beyondViewportPageCount = 1) { page ->
                val s = slides[page]
                val visible = page == pager.currentPage
                val image = api.url(s.image)
                Box(Modifier.fillMaxSize()) {
                    if (video == null && image != null) {
                        if (landscape) RemoteImage(image, Modifier.fillMaxSize())
                        else {
                            RemoteImage(image, Modifier.fillMaxSize().blur(36.dp).alpha(0.45f))
                            RemoteImage(image, Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(top = topBar).aspectRatio(16f / 9f), contentScale = ContentScale.Fit)
                        }
                    }
                    // scrim: text reads over anything
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.35f to Color.Transparent, 1f to Dark.copy(alpha = 0.92f))))
                    val hasBand = !landscape && (video != null || image != null)
                    AnimatedVisibility(
                        visible = visible,
                        enter = fadeIn(tween(450)) + slideInVertically(tween(450)) { it / 14 },
                        exit = fadeOut(tween(250)),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        SlideText(
                            s, recipe, str, narrator, api,
                            landscape = landscape,
                            band = hasBand,
                            topBar = topBar,
                            onNext = { scope.launch { pager.animateScrollToPage(1) } },
                            onStart = { scope.launch { pager.animateScrollToPage(0) } },
                            onBack = onBack,
                        )
                    }
                }
            }

            // top bar: back, counter, progress line
            Column(Modifier.fillMaxWidth().background(Brush.verticalGradient(0f to Dark.copy(alpha = 0.7f), 1f to Color.Transparent))) {
                val progress by animateFloatAsState(if (slides.size > 1) pager.currentPage.toFloat() / (slides.size - 1) else 1f, tween(350))
                Box(Modifier.fillMaxWidth().height(3.dp).background(Color.White.copy(alpha = 0.12f))) {
                    Box(Modifier.fillMaxWidth(progress).fillMaxHeight().background(Amber))
                }
                Row(
                    Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).height(topBar).padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    DarkPill(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(str.recipe, style = MaterialTheme.typography.labelLarge)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (recipe.audio != null) {
                            DarkPill(onClick = { auto = !auto; if (!auto) narrator.stop() }) {
                                Icon(
                                    if (auto) Icons.AutoMirrored.Filled.VolumeUp else Icons.AutoMirrored.Filled.VolumeOff,
                                    contentDescription = if (auto) str.narrationOn else str.narrationOff,
                                    tint = if (auto) Amber else DarkMuted,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                            DarkPill(onClick = null) { Text("${pager.currentPage + 1} / ${slides.size}", style = MaterialTheme.typography.labelLarge, color = DarkMuted) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DarkPill(onClick: (() -> Unit)?, content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.clip(CircleShape).background(Dark.copy(alpha = 0.5f)).border(1.dp, Color.White.copy(alpha = 0.14f), CircleShape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) { CompositionLocalProvider(LocalContentColor provides DarkInk) { content() } }
}

@Composable
private fun SlideText(
    s: Slide, recipe: Recipe, str: Str, narrator: Narrator, api: RecipesApi,
    landscape: Boolean, band: Boolean, topBar: Dp,
    onNext: () -> Unit, onStart: () -> Unit, onBack: () -> Unit,
) {
    val centered = s is Slide.Cover || s is Slide.End
    val pad = if (landscape) 48.dp else 24.dp
    BoxWithConstraints(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
        // the footage/photo band is 16:9 of the width, right under the top bar
        val bandBottom = if (band) topBar + maxWidth * 9f / 16f else 0.dp
        Column(
            Modifier.padding(horizontal = pad).then(
                if (centered) {
                    if (band) Modifier.align(Alignment.TopCenter).padding(top = bandBottom).fillMaxHeight().wrapContentHeight(Alignment.CenterVertically)
                    else Modifier.align(Alignment.Center)
                } else if (landscape) Modifier.align(Alignment.BottomStart).padding(bottom = 36.dp).fillMaxWidth(0.7f)
                else Modifier.align(Alignment.TopStart).padding(top = bandBottom + 22.dp, bottom = 24.dp).verticalScroll(rememberScrollState()),
            ),
            horizontalAlignment = if (centered) Alignment.CenterHorizontally else Alignment.Start,
        ) {
            when (s) {
                is Slide.Cover -> {
                    recipe.yield?.let { Kicker("${formatScaled(it.amount)} ${it.unit}", rule = false) }
                    Text(recipe.name, style = MaterialTheme.typography.displaySmall.copy(fontSize = 40.sp, lineHeight = 44.sp), color = DarkInk, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(10.dp))
                    Text("${str.ingredientsN(recipe.ingredients.size)} · ${str.stepsN(recipe.steps.size)}", color = DarkMuted, style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(30.dp))
                    Column(Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onNext).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(str.scroll.uppercase(), style = MaterialTheme.typography.labelMedium, color = DarkMuted)
                        Icon(Icons.Default.KeyboardArrowDown, null, tint = DarkMuted)
                    }
                }
                is Slide.Ingredients -> {
                    Kicker(str.ingredients)
                    recipe.ingredients.forEach { ing ->
                        Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(Amber))
                            Spacer(Modifier.width(12.dp))
                            Text(buildString { append(ing.quantity); if (ing.quantity.isNotBlank()) append(' '); append(ing.name) }, color = DarkInk, style = MaterialTheme.typography.bodyLarge.copy(fontSize = 19.sp, lineHeight = 27.sp))
                        }
                    }
                    ListenButton(s, narrator, api, str)
                }
                is Slide.Step -> {
                    Kicker("${str.step} ${s.index + 1} ${str.of} ${recipe.steps.size}")
                    val (lead, body) = splitLead(s.text)
                    if (lead != null) {
                        Text(lead, style = MaterialTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 34.sp), color = DarkInk)
                        Spacer(Modifier.height(8.dp))
                    }
                    Text(body, style = MaterialTheme.typography.bodyLarge.copy(fontSize = 19.sp, lineHeight = 28.sp), color = DarkInk)
                    ListenButton(s, narrator, api, str)
                }
                is Slide.End -> {
                    Text(str.done, style = MaterialTheme.typography.displaySmall, color = DarkInk)
                    Spacer(Modifier.height(22.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = onStart, shape = CircleShape, border = ButtonDefaults.outlinedButtonBorder(true).copy(brush = Brush.linearGradient(listOf(Color.White.copy(alpha = 0.3f), Color.White.copy(alpha = 0.3f))))) {
                            Text(str.startOver, color = DarkInk)
                        }
                        Button(onClick = onBack, shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Amber, contentColor = Dark)) { Text(str.backToRecipe) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Kicker(t: String, rule: Boolean = true) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
        if (rule) {
            Box(Modifier.width(26.dp).height(2.dp).background(Amber))
            Spacer(Modifier.width(10.dp))
        }
        Text(t.uppercase(), style = MaterialTheme.typography.labelMedium, color = Amber)
    }
}

@Composable
private fun ListenButton(s: Slide, narrator: Narrator, api: RecipesApi, str: Str) {
    val url = api.url(s.audio) ?: return
    val on = narrator.playing == url
    Spacer(Modifier.height(16.dp))
    Row(
        Modifier.clip(CircleShape).background(if (on) Amber.copy(alpha = 0.22f) else Color.White.copy(alpha = 0.1f))
            .border(1.dp, if (on) Amber.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.22f), CircleShape)
            .clickable { narrator.toggle(url) }.padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(if (on) Icons.Default.Stop else Icons.Default.PlayArrow, null, tint = Amber, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(if (on) str.stop else str.listen, color = DarkInk, style = MaterialTheme.typography.labelLarge)
    }
}

// ── Editor: new recipe, or everything of an existing one ─────────────────────

@Composable
private fun EditScreen(recipe: Recipe?, onBack: () -> Unit, onSaved: (Recipe) -> Unit) {
    val str = LocalStr.current
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(recipe?.name ?: "") }
    val ingredients = remember { mutableStateListOf<Pair<String, String>>().apply { addAll(recipe?.ingredients?.map { it.quantity to it.name } ?: listOf("" to "")) } }
    val steps = remember { mutableStateListOf<String>().apply { addAll(recipe?.steps ?: listOf("")) } }
    var yieldAmount by remember { mutableStateOf(recipe?.yield?.let { formatScaled(it.amount) } ?: "") }
    var yieldUnit by remember { mutableStateOf(recipe?.yield?.unit ?: "") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val rtl = (name.ifBlank { recipe?.name ?: "" }).any { it in '֐'..'׿' }

    fun draft(): RecipeDraft? {
        val ings = ingredients.filter { it.second.isNotBlank() }.map { Ingredient(it.second.trim(), it.first.trim()) }
        val sts = steps.map { it.trim() }.filter { it.isNotEmpty() }
        if (name.isBlank() || ings.isEmpty() || sts.isEmpty()) return null
        val amount = yieldAmount.replace(',', '.').toDoubleOrNull()
        val y = if (amount != null && amount > 0 && yieldUnit.isNotBlank()) RecipeYield(amount, yieldUnit.trim()) else null
        return RecipeDraft(name.trim(), ings, sts, y)
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack, enabled = !saving) { Icon(Icons.Default.Close, contentDescription = str.cancel, tint = Ink) }
            Text(if (recipe == null) str.newRecipe else str.edit, style = MaterialTheme.typography.titleLarge, color = Ink, modifier = Modifier.weight(1f))
            Button(
                enabled = !saving,
                onClick = {
                    val d = draft()
                    if (d == null) { error = str.needed; return@Button }
                    saving = true
                    scope.launch {
                        val r = if (recipe == null) api.create(d) else api.update(recipe.id, d)
                        when (r) {
                            is Result.Ok -> onSaved(r.value)
                            is Result.Err -> { error = r.message; saving = false }
                        }
                    }
                },
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(containerColor = Terracotta, contentColor = Color.White),
            ) { Text(if (saving) str.saving else str.save) }
        }
        CompositionLocalProvider(LocalLayoutDirection provides if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr) {
            LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 60.dp)) {
                item {
                    Field(name, { name = it }, str.name, big = true)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Field(yieldAmount, { yieldAmount = it }, str.yieldAmount, modifier = Modifier.width(110.dp), number = true)
                        Field(yieldUnit, { yieldUnit = it }, str.yieldUnit, modifier = Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(24.dp))
                    SectionTitle(str.ingredients)
                }
                itemsIndexed(ingredients) { i, (qty, nm) ->
                    Row(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Field(qty, { ingredients[i] = it to nm }, str.quantity, modifier = Modifier.width(96.dp))
                        Field(nm, { ingredients[i] = qty to it }, str.ingredient, modifier = Modifier.weight(1f))
                        IconButton(onClick = { ingredients.removeAt(i) }, enabled = ingredients.size > 1) { Icon(Icons.Default.Close, null, tint = Muted) }
                    }
                }
                item {
                    TextButton(onClick = { ingredients.add("" to "") }, contentPadding = PaddingValues(0.dp)) { Text("+ ${str.addIngredient}", color = Terracotta, fontWeight = FontWeight.SemiBold) }
                    Spacer(Modifier.height(20.dp))
                    SectionTitle(str.preparation)
                }
                itemsIndexed(steps) { i, s ->
                    Row(Modifier.padding(bottom = 8.dp), verticalAlignment = Alignment.Top) {
                        Text("${i + 1}.", style = MaterialTheme.typography.titleMedium, color = Terracotta, modifier = Modifier.width(30.dp).padding(top = 16.dp))
                        Field(s, { steps[i] = it }, "${str.step} ${i + 1}", modifier = Modifier.weight(1f), multiline = true)
                        IconButton(onClick = { steps.removeAt(i) }, enabled = steps.size > 1, modifier = Modifier.padding(top = 4.dp)) { Icon(Icons.Default.Close, null, tint = Muted) }
                    }
                }
                item {
                    TextButton(onClick = { steps.add("") }, contentPadding = PaddingValues(0.dp)) { Text("+ ${str.addStep}", color = Terracotta, fontWeight = FontWeight.SemiBold) }
                    error?.let { Spacer(Modifier.height(12.dp)); ErrorCard(it) { error = null } }
                }
            }
        }
    }
}

@Composable
private fun Field(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier, big: Boolean = false, number: Boolean = false, multiline: Boolean = false) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = modifier.then(if (big || multiline) Modifier.fillMaxWidth() else Modifier),
        placeholder = { Text(hint, color = Muted) },
        singleLine = !multiline,
        minLines = if (multiline) 2 else 1,
        textStyle = if (big) MaterialTheme.typography.titleLarge else MaterialTheme.typography.bodyLarge,
        keyboardOptions = KeyboardOptions(keyboardType = if (number) KeyboardType.Decimal else KeyboardType.Text),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Card, unfocusedContainerColor = Card,
            focusedBorderColor = Terracotta, unfocusedBorderColor = Line, cursorColor = Terracotta,
        ),
    )
}
