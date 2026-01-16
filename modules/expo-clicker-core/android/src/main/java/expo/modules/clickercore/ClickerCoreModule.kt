package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.os.Build
import kotlinx.coroutines.*
import java.net.URL
import java.net.HttpURLConnection

class ClickerCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerCoreModule")

    // 서버 시간 동기화 로직 (Latency 보정 포함)
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        return@AsyncFunction withContext(Dispatchers.IO) {
            try {
                val start = System.currentTimeMillis()
                val connection = URL(targetUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "HEAD"
                connection.connectTimeout = 3000
                connection.connect()
                val serverDate = connection.date
                val end = System.currentTimeMillis()
                
                val latency = (end - start) / 2
                val offset = (serverDate + latency) - end
                return@withContext offset.toDouble()
            } catch (e: Exception) {
                return@withContext 0.0
            }
        }
    }

    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, OverlayService::class.java).apply {
          putExtra("mode", mode)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
      return@Function true
    }

    Function("performClick") { x: Float, y: Float ->
      val context = appContext.reactContext ?: return@Function false
      
      // 1. 클릭 실행
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      
      // 2. [방식 A] 즉시 은신 (오버레이 종료)
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
