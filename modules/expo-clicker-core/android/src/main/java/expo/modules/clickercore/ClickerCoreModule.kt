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

    // 동기화 실패 해결: GET 방식으로 변경 및 헤더 추가
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val url = URL(targetUrl)
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "GET" // HEAD 대신 GET 사용
            connection.connectTimeout = 5000 // 5초로 연장
            connection.readTimeout = 5000
            connection.setRequestProperty("User-Agent", "Mozilla/5.0") // 서버 거부 방지
            
            connection.connect()
            
            // 날짜 헤더가 없으면 에러 발생시킴
            val serverDate = connection.date
            if (serverDate == 0L) throw Exception("No date header")

            val end = System.currentTimeMillis()
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            
            connection.disconnect()
            return@AsyncFunction offset.toDouble()
        } catch (e: Exception) {
            e.printStackTrace()
            return@AsyncFunction -999999.0 // 실패 시 명확한 에러 값 반환
        }
    }

    // 나머지 함수들 (showOverlay, openSettings 등은 기존과 동일하게 유지)
    Function("showOverlay") { mode: String ->
        val context = appContext.reactContext ?: throw Exception("Context Lost")
        val intent = Intent(context, OverlayService::class.java).apply { putExtra("mode", mode) }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            return@Function true
        } catch (e: Exception) {
            throw Exception("SERVICE_START_FAILED: ${e.message}")
        }
    }

    Function("checkOverlayPermission") {
        val context = appContext.reactContext ?: return@AsyncFunction false
        return@AsyncFunction if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else true
    }
  }
}

// SharedData는 파일 최하단 클래스 밖에 위치

// ⬇️ [중요] SharedData를 클래스 밖(Top-Level)에 선언해야 다른 파일에서 바로 보입니다.
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
