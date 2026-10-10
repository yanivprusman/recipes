package com.automatelinux.recipes.data

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

/** One HTTP round trip — the Android half is on the JDK client. */
expect suspend fun httpRequest(method: String, url: String, body: ByteArray?, contentType: String?): HttpResult

class HttpResult(val code: Int, val bytes: ByteArray, val transportError: String? = null) {
    val text: String get() = bytes.decodeToString()
}

sealed class Result<out T> {
    data class Ok<T>(val value: T) : Result<T>()
    data class Err(val message: String) : Result<Nothing>()
}

private val json = Json { ignoreUnknownKeys = true; isLenient = true; explicitNulls = false; encodeDefaults = false }

/**
 * The phone is a client of the web app's JSON routes (app/api/recipes). Failures come
 * back as sentences, not exceptions: "the VPN is down" has to read as that, not as a spinner.
 */
class RecipesApi(baseUrl: String, private val he: Boolean) {
    val base = baseUrl.trimEnd('/')

    /** Absolute URL for a site-relative media path from the server. */
    fun url(path: String?): String? = path?.let { if (it.startsWith("http")) it else "$base$it" }

    private fun describe(r: HttpResult): String {
        val server = runCatching { json.decodeFromString(ErrorBody.serializer(), r.text).error }.getOrNull()
        return when {
            r.code == 0 -> if (he) "אין חיבור לשרת — בדקו שה‑VPN פעיל" else "No connection to the server — is the VPN on?"
            server != null -> server
            else -> if (he) "השרת החזיר תשובה לא צפויה (${r.code})" else "Unexpected reply from the server (${r.code})"
        }
    }

    private fun bad(e: Throwable) = Result.Err(if (he) "תשובה לא תקינה מהשרת: ${e.message}" else "Malformed reply from the server: ${e.message}")

    suspend fun list(): Result<List<Recipe>> {
        val r = httpRequest("GET", "$base/api/recipes", null, null)
        if (r.code != 200) return Result.Err(describe(r))
        return runCatching { Result.Ok(json.decodeFromString(ListSerializer(Recipe.serializer()), r.text)) }.getOrElse { bad(it) }
    }

    suspend fun get(id: String): Result<Recipe> {
        val r = httpRequest("GET", "$base/api/recipes/$id", null, null)
        if (r.code != 200) return Result.Err(describe(r))
        return runCatching { Result.Ok(json.decodeFromString(Recipe.serializer(), r.text)) }.getOrElse { bad(it) }
    }

    suspend fun create(draft: RecipeDraft): Result<Recipe> {
        val body = json.encodeToString(RecipeDraft.serializer(), draft).encodeToByteArray()
        val r = httpRequest("POST", "$base/api/recipes", body, "application/json; charset=utf-8")
        if (r.code != 201 && r.code != 200) return Result.Err(describe(r))
        return runCatching { Result.Ok(json.decodeFromString(Recipe.serializer(), r.text)) }.getOrElse { bad(it) }
    }

    suspend fun update(id: String, draft: RecipeDraft): Result<Recipe> {
        val body = json.encodeToString(RecipeDraft.serializer(), draft).encodeToByteArray()
        val r = httpRequest("PUT", "$base/api/recipes/$id", body, "application/json; charset=utf-8")
        if (r.code != 200) return Result.Err(describe(r))
        return runCatching { Result.Ok(json.decodeFromString(Recipe.serializer(), r.text)) }.getOrElse { bad(it) }
    }

    suspend fun delete(id: String): Result<Unit> {
        val r = httpRequest("DELETE", "$base/api/recipes/$id", null, null)
        return if (r.code == 200) Result.Ok(Unit) else Result.Err(describe(r))
    }
}
