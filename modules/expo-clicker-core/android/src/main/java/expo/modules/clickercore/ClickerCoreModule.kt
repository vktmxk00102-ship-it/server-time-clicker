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

    // 1. 서버 시간 동기화 (네트워크 타임아웃 및 예외 처리 강화)
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
      try {
        val url = URL(targetUrl)
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 3000
        connection.readTimeout = 3000
        connection.setRequestProperty("User-Agent", "Mozilla/5.0")
        
        connection.connect()
        val serverDate = connection.date
        connection.disconnect()

        if (serverDate == 0L) return@AsyncFunction 0.0

        val end = System.currentTimeMillis()
        (serverDate - end).toDouble()
      } catch (e: Exception) {
        -999.0 // 에러 발생 시 식별 가능한 값 반환
      }
    }

    // 2. 권한 확인 (가장 안전한 Context 접근)
    AsyncFunction("checkOverlayPermission") {
      val context = appContext.reactContext ?: appContext.currentActivity ?: return@AsyncFunction false
      return@AsyncFunction if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
    }

    // 3. 설정 화면 열기 (꺼짐 방지 핵심 로직)
    Function("openSettings") {
      // currentActivity를 우선 사용하고 없으면 reactContext 사용
      val activity = appContext.currentActivity ?: appContext.reactContext
      
      if (activity == null) return@Function false

      try {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
          data = Uri.parse("package:${activity.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
        true
      } catch (e: Exception) {
        // 패키지 지정 방식 실패 시 전체 목록이라도 실행 (절대 크래시 안 남)
        try {
          val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          activity.startActivity(fallbackIntent)
          true
        } catch (e2: Exception) {
          false
        }
      }
    }

    // 4. 오버레이 표시
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: appContext.currentActivity ?: return@Function false
      try {
        val intent = Intent(context, OverlayService::class.java).apply {
          putExtra("mode", mode)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        true
      } catch (e: Exception) {
        false
      }
    }

    // 5. 클릭 실행
    Function("performClick") { x: Float, y: Float ->
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      
      // 클릭 후 오버레이 닫기
      val context = appContext.reactContext ?: appContext.currentActivity
      context?.let {
        val intent = Intent(it, OverlayService::class.java)
        it.stopService(intent)
      }
      true
    }
  }
}

// 파일 최하단: 다른 클래스에서 접근 가능하도록 object로 유지
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
