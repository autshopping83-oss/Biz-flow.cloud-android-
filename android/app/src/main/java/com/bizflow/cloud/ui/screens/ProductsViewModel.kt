package com.bizflow.cloud.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.entity.ProductEntity
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.ProductRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

class ProductsViewModel(
    private val productRepository: ProductRepository,
    private val companySettingsRepository: CompanySettingsRepository,
) : ViewModel() {

    data class ProductsUiState(
        val products: List<ProductEntity> = emptyList(),
        val currency: String = "MZN",
        val searchQuery: String = "",
        val isLoading: Boolean = true,
    )

    private val _searchQuery = MutableStateFlow("")

    val uiState: StateFlow<ProductsUiState> = combine(
        productRepository.observeAll(),
        companySettingsRepository.observeCurrency(),
        _searchQuery,
    ) { products, currency, query ->
        val filtered = if (query.isBlank()) products
        else products.filter {
            it.name.contains(query, ignoreCase = true) ||
                it.category.orEmpty().contains(query, ignoreCase = true)
        }
        ProductsUiState(
            products = filtered,
            currency = currency,
            searchQuery = query,
            isLoading = false,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ProductsUiState(),
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun save(
        id: String?,
        name: String,
        price: Double,
        category: String,
        onDone: () -> Unit,
    ) {
        val cleanName = name.trim()
        if (cleanName.isEmpty() || price <= 0) return
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val product = ProductEntity(
                id = id ?: UUID.randomUUID().toString(),
                name = cleanName,
                price = price,
                category = category.trim().ifBlank { null },
                userId = null,
                createdAt = now,
                updatedAt = now,
                deletedAt = null,
            )
            productRepository.save(product)
            onDone()
        }
    }

    fun delete(id: String) {
        viewModelScope.launch { productRepository.softDelete(id) }
    }

    companion object {
        val PRODUCT_CATEGORIES = emptyList<String>()

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                ProductsViewModel(
                    productRepository = app.productRepository,
                    companySettingsRepository = app.companySettingsRepository,
                )
            }
        }
    }
}
