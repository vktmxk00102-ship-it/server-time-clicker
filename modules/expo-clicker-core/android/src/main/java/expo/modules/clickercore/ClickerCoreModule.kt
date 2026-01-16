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

    // 1. 서버 시간 동기화 (사용자 원본 RTT 보정 로직 유지)
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
            0.0 // 에러 시 0.0 반환 유지
        }
    }

    // 2. 권한 확인 함수 (Context 참조 방식 강화)
    AsyncFunction("checkOverlayPermission") {
        // currentActivity를 우선 시도하여 Null 방어
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    // 3. 오버레이 표시 (안드로이드 16 대응 플래그 보강)
    Function("showOverlay") { mode: String ->
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        
        try {
            // SharedData에 모드 기록 (원본 유지)
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

    // 4. 클릭 실행 및 은신
    Function("performClick") { x: Float, y: Float ->
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        
        // 인자가 0이면 저장된 좌표 사용 (추가 안전장치)
        val finalX = if (x == 0f) SharedData.targetX else x
        val finalY = if (y == 0f) SharedData.targetY else y
        
        ClickerAccessibilityService.instance?.performClickAt(finalX, finalY)
        
        val intent = Intent(context, OverlayService::class.java)
        context.stopService(intent)
        true
    }

    // 5. 설정 화면 열기 (안드로이드 16 대응 패키지 지정 방식 수정)
    Function("openSettings") {
        val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
        try {
            // Uri.fromParts를 사용하여 안드로이드 16 안정성 확보
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            // 패키지 지정 방식 실패 시 일반 설정창으로 우회 (절대 안 꺼지게 방어)
            try {
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                true
            } catch (e2: Exception) {
                false
            }
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
