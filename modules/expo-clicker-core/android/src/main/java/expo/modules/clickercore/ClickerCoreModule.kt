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
  // 모듈의 수명 주기에 맞춘 코루틴 스코프 정의
  private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  override fun definition() = ModuleDefinition {
    Name("ClickerCoreModule")

    // 서버 시간 동기화 로직 (오류 수정됨)
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        // 1. CompletableDeferred를 사용하여 비동기 작업의 결과를 기다림
        val result = CompletableDeferred<Double>()
        
        moduleScope.launch {
            try {
                val start = System.currentTimeMillis()
                val connection = URL(targetUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "HEAD"
                connection.connectTimeout = 3000
                connection.connect()
                
                val serverDate = connection.date
                val end = System.currentTimeMillis()
                
                // 네트워크 지연 시간(Latency) 보정
                val latency = (end - start) / 2
                val offset = (serverDate + latency) - end
                
                result.complete(offset.toDouble())
            } catch (e: Exception) {
                result.complete(0.0)
            }
        }
        
        // 2. 비동기 작업의 결과를 반환
        return@AsyncFunction result.await()
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
      
      // 2. 실행 즉시 은신 (오버레이 종료)
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
