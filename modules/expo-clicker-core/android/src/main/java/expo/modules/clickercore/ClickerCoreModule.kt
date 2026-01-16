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

    // 1. 서버 시간 동기화 (네트워크 요청)
    // AsyncFunction은 백그라운드에서 실행되므로 복잡한 코루틴 없이 동기 코드로 작성해도 안전합니다.
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val connection = URL(targetUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 3000 // 3초 타임아웃
            
            // 네트워크 요청 실행
            connection.connect()
            
            val serverDate = connection.date // 헤더의 Date 값
            val end = System.currentTimeMillis()

            if (serverDate == 0L) {
                return@AsyncFunction 0.0
            }

            // 네트워크 왕복 시간(Latency) 절반을 보정값으로 사용
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            
            return@AsyncFunction offset.toDouble()
        } catch (e: Exception) {
            // 실패 시 0 반환
            return@AsyncFunction 0.0
        }
    }

    // 2. 오버레이 표시 (안전장치 추가됨)
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      
      // [핵심 수정] 권한이 없는 상태에서 서비스를 시작하면 앱이 죽으므로 먼저 체크합니다.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
          // 권한 없음: JS 쪽에서 catch 문으로 빠지게 하여 설정창 유도
          throw Exception("Overlay permission not granted")
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
      } catch (e: Exception) {
          e.printStackTrace()
          return@Function false
      }
    }

    // 3. 클릭 실행 및 은신
    Function("performClick") { x: Float, y: Float ->
      val context = appContext.reactContext ?: return@Function false
      
      // 실제 클릭 수행 (접근성 서비스 이용)
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      
      // 클릭 직후 오버레이 종료 (은신 모드)
      context.stopService(Intent(context, OverlayService::class.java))
      return@Function true
    }

    // 4. 권한 설정 화면 열기
    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function true
    }
  }
}

// 데이터 공유 객체
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
