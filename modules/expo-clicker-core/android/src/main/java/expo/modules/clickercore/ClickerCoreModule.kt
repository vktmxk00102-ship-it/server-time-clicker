package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.os.Build
import java.net.URL
import java.net.HttpURLConnection

object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}

class ClickerCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerCoreModule")

    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val url = URL(targetUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.setRequestProperty("User-Agent", "Mozilla/5.0")
            connection.connect()
            val serverDate = connection.date
            connection.disconnect()
            if (serverDate == 0L) return@AsyncFunction "0.0"
            val end = System.currentTimeMillis()
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            offset.toDouble().toString()
        } catch (e: Exception) { "0.0" }
    }

    AsyncFunction("checkOverlayPermission") {
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true
    }

    Function("showOverlay") { mode: String ->
        val context = appContext.reactContext ?: appContext.currentActivity ?: return@Function false
        try {
            SharedData.isCaptureMode = (mode == "ID")
            val intent = Intent(context, OverlayService::class.java).apply {
                putExtra("mode", mode)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
            true
        } catch (e: Exception) { false }
    }

    Function("performClick") { x: Float, y: Float ->
        val finalX = if (x == 0f) SharedData.targetX else x
        val finalY = if (y == 0f) SharedData.targetY else y
        ClickerAccessibilityService.instance?.performClickAt(finalX, finalY)
        true
    }

    Function("openSettings") {
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) { false }
    }
  }
}
