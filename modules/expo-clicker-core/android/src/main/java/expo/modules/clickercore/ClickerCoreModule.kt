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

    // 1. 서버 시간 동기화 (사용자님의 RTT 보정 로직 그대로 반영)
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

            if (serverDate == 0L) return@AsyncFunction 0.0

            val end = System.currentTimeMillis()
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            
            offset.toDouble()
        } catch (e: Exception) {
            0.0
        }
    }

    // 2. 권한 확인 함수 (Context 참조 안정성 강화)
    AsyncFunction("checkOverlayPermission") {
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    // 3. 오버레이 표시 (사용자님의 Boolean 반환 유지 + 안드로이드 16 플래그)
    Function("showOverlay") { mode: String ->
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        
        try {
            SharedData.isCaptureMode = (mode == "ID")
            val intent = Intent(context, OverlayService::class.java).apply {
                putExtra("mode", mode)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            true 
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // 4. 클릭 실행 및 서비스 종료 (사용자님 로직 그대로)
    Function("performClick") { x: Float, y: Float ->
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        
        // x, y가 0이면 SharedData의 좌표를 사용하도록 보정 (선택 사항)
        val finalX = if (x == 0f) SharedData.targetX else x
        val finalY = if (y == 0f) SharedData.targetY else y
        
        ClickerAccessibilityService.instance?.performClickAt(finalX, finalY)
        
        val intent = Intent(context, OverlayService::class.java)
        context.stopService(intent)
        true
    }

    // 5. 설정 화면 열기 (사용자님 로직 + 안드로이드 16 패키지 경로 안정화)
    Function("openSettings") {
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
  }
}

// 사용자님의 요구사항인 SharedData 전역 배치
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
