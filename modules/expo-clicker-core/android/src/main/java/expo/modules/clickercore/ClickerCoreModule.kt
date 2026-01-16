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
      val context = appContext.reactContext ?: throw Exception("React Context Lost")
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
          throw Exception("PERMISSION_DENIED: 권한이 없습니다.")
      }

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
      } catch (e: SecurityException) {
          e.printStackTrace()
          throw Exception("SECURITY_ERROR: 권한 부족.")
      } catch (e: Exception) {
          e.printStackTrace()
          throw Exception("ERROR: ${e.message}")
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
} // ⬅️ 클래스가 여기서 끝납니다.

// ⬇️ [중요] SharedData를 클래스 밖(Top-Level)에 선언해야 다른 파일에서 바로 보입니다.
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
