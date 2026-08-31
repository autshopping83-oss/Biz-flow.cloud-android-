package com.bizflow.cloud.data.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import com.bizflow.cloud.BizFlowApplication

/**
 * Observa o estado da conectividade de rede e dispara um sync imediato quando
 * a rede volta (offline-first): entradas da fila pendentes sao enviadas e o
 * pull incremental e' feito assim que ha conectividade.
 */
object ConnectivityMonitor {

    private var callback: ConnectivityManager.NetworkCallback? = null

    fun start(context: Context) {
        if (callback != null) return
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                val app = context.applicationContext as BizFlowApplication
                if (app.authManager.currentUserId() != null) {
                    SyncScheduler.syncNow(context)
                }
            }
        }
        connectivity.registerNetworkCallback(request, callback!!)
    }

    fun stop(context: Context) {
        callback?.let {
            val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            connectivity.unregisterNetworkCallback(it)
        }
        callback = null
    }
}
