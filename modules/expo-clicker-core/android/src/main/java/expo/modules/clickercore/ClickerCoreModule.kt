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

    // [수정] 복잡한 코루틴 제거 -> 단순 동기 코드로 변경
    // AsyncFunction은 이미 백그라운드 스레드에서 돌기 때문에 멈춰도(Block) 됩니다.
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val connection = URL(targetUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 3000 // 3초 타임아웃
            
            // 여기서 네트워크 요청을 보낼 때까지 잠시 대기함 (백그라운드라 괜찮음)
            connection.connect()
            
            val serverDate = connection.date // 헤더에서 Date 가져오기
            val end = System.currentTimeMillis()

            if (serverDate == 0L) {
                return@AsyncFunction 0.0
            }

            // 네트워크 왕복 시간(Latency) 절반을 더해서 오차 보정
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            
            return@AsyncFunction offset.toDouble()
        } catch (e: Exception) {
            // 에러 나면 오차 0으로 반환
            return@AsyncFunction 0.0
        }
    }

    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, OverlayService::class.java).apply {
          putExtra("mode", mode)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
      } else {
          context.startService(intent)
      }
      return@Function true
    }

    Function("performClick") { x: Float, y: Float ->
      val context = appContext.reactContext ?: return@Function false
      
      // 1. 클릭 실행
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      
      // 2. 실행 즉시 은신
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
