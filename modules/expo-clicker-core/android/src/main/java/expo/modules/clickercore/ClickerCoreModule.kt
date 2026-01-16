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

    // 1. 서버 시간 동기화 (GET 방식)
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

    // 2. 권한 확인 함수
    AsyncFunction("checkOverlayPermission") {
        val context = appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    // 3. 오버레이 표시 (Type mismatch 해결)
    Function("showOverlay") { mode: String ->
        val context = appContext.reactContext ?: return@Function false
        
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
            true // 마지막 줄에 true를 두어 Boolean 반환을 명시
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // 4. 클릭 실행 및 은신
    Function("performClick") { x: Float, y: Float ->
        val context = appContext.reactContext ?: return@Function false
        
        ClickerAccessibilityService.instance?.performClickAt(x, y)
        
        val intent = Intent(context, OverlayService::class.java)
        context.stopService(intent)
        true
    }

    // 5. 설정 화면 열기
    Function("openSettings") {
        val context = appContext.reactContext ?: return@Function false
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
    }
  }
}

// SharedData는 클래스 밖에 배치하여 다른 파일에서도 인식 가능하게 함
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
