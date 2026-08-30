package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.ClientDao
import com.bizflow.cloud.data.local.entity.ClientEntity
import kotlinx.coroutines.flow.Flow

class ClientRepository(
    private val clientDao: ClientDao,
) {
    fun observeAll(): Flow<List<ClientEntity>> = clientDao.observeAll()
}