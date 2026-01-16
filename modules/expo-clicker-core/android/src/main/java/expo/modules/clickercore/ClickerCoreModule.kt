package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.os.Build
import java.net.URL
import java.net.HttpURLConnection

class ClickerCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerCoreModule")

    // [추가] 현재 오버레이 권한이 있는지 확인하는 함수
    AsyncFunction("checkOverlayPermission") {
        val context = appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return@AsyncFunction Settings.canDrawOverlays(context)
        }
        return@AsyncFunction true
    }

    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val connection = URL(targetUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 3000
            connection.connect()
            val serverDate = connection.date
            val end = System.currentTimeMillis()
            if (serverDate == 0L) return@AsyncFunction 0.0
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            return@AsyncFunction offset.toDouble()
        } catch (e: Exception) {
            return@AsyncFunction 0.0
        }
    }

    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      try {
          val intent = Intent(context, OverlayService::class.java).apply {
              putExtra("mode", mode)
          }
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              context.startForegroundService(intent)
          } else {
              context.startService(intent)
          }
          return@Function true
      } catch (e: Exception) {
          return@Function false
      }
    }

    Function("performClick") { x: Float, y: Float ->
      val context = appContext.reactContext ?: return@Function false
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      context.stopService(Intent(context, OverlayService::class.java))
      return@Function true
    }

    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function true
    }
  }
}

object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
