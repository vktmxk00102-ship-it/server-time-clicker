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

    // 1. 서버 시간 동기화 (에러 메시지 반환)
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
      try {
        val url = URL(targetUrl)
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 3000
        connection.setRequestProperty("User-Agent", "Mozilla/5.0")
        connection.connect()
        val serverDate = connection.date
        connection.disconnect()

        if (serverDate == 0L) return@AsyncFunction "ERROR: Date Header Missing"
        
        val offset = (serverDate - System.currentTimeMillis()).toDouble()
        offset.toString() // 숫자를 문자열로 전달
      } catch (e: Exception) {
        "ERROR: ${e.localizedMessage}"
      }
    }

    // 2. 권한 확인
    Function("checkOverlayPermission") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else true
    }

    // 3. 설정 창 열기 (안드로이드 16 대응 플래그 추가)
    Function("openSettings") {
      val activity = appContext.currentActivity ?: return@Function "ERROR: Activity is Null"
      try {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
          data = Uri.fromParts("package", activity.packageName, null)
          // 최신 안드로이드 필수 플래그
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
          addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
        }
        activity.startActivity(intent)
        "OK"
      } catch (e: Exception) {
        "CRASH_LOG: ${e.message}\n${e.stackTrace.take(2).joinToString("\n")}"
      }
    }

    // 4. 오버레이 표시
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function "ERROR: Context is Null"
      try {
        val intent = Intent(context, OverlayService::class.java).apply {
          putExtra("mode", mode)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        "OK"
      } catch (e: Exception) {
        "CRASH_LOG: ${e.message}"
      }
    }

    Function("performClick") { x: Float, y: Float ->
      try {
        ClickerAccessibilityService.instance?.performClickAt(x, y)
        "OK"
      } catch (e: Exception) {
        "ERROR: ${e.message}"
      }
    }
  }
}

object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
