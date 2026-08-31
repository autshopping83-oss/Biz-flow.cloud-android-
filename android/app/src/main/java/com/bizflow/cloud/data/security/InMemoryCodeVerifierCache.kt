package com.bizflow.cloud.data.security

import io.github.jan.supabase.gotrue.CodeVerifierCache

/**
 * Cache do code verifier PKCE em memoria. Evita depender do Settings default
 * do gotrue-kt (DataStore/SharedPreferences global), que nao e inicializado em
 * testes (Robolectric) e nunca armazena o verifier em texto simples no disco.
 * O verifier e' efemero (ciclo de vida do fluxo OAuth) e o fluxo principal
 * (password grant) nao usa PKCE.
 */
class InMemoryCodeVerifierCache : CodeVerifierCache {
    private var verifier: String? = null

    override suspend fun saveCodeVerifier(verifier: String) {
        this.verifier = verifier
    }

    override suspend fun loadCodeVerifier(): String = verifier.orEmpty()

    override suspend fun deleteCodeVerifier() {
        verifier = null
    }
}
