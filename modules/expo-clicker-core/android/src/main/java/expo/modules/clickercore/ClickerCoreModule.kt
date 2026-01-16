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
    // 1. 모듈 이름 정의 (JS에서 NativeModules.ClickerCoreModule로 접근)
    Name("ClickerCoreModule")

    // 2. 권한 확인 함수 (앱 시작 시 호출됨)
    AsyncFunction("checkOverlayPermission") {
        val context = appContext.reactContext ?: return@AsyncFunction false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return@AsyncFunction Settings.canDrawOverlays(context)
        }
        return@AsyncFunction true
    }

    // 3. 서버 시간 동기화 (네트워크 요청)
    AsyncFunction("getServerTimeOffset") { targetUrl: String ->
        try {
            val start = System.currentTimeMillis()
            val connection = URL(targetUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "HEAD"
            connection.connectTimeout = 3000 // 3초 타임아웃
            
            connection.connect()
            
            val serverDate = connection.date
            val end = System.currentTimeMillis()

            if (serverDate == 0L) {
                return@AsyncFunction 0.0
            }

            // 레이턴시 보정 계산
            val latency = (end - start) / 2
            val offset = (serverDate + latency) - end
            
            return@AsyncFunction offset.toDouble()
        } catch (e: Exception) {
            // 실패 시 오차 0 반환
            return@AsyncFunction 0.0
        }
    }

    // 4. 오버레이 표시 (가장 중요한 부분 - 크래시 방지 적용)
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: throw Exception("React Context Lost")
      
      // [안전장치 1] 권한이 없으면 아예 실행 시도조차 하지 않고 에러 발생
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
          throw Exception("PERMISSION_DENIED: 다른 앱 위에 표시 권한이 없습니다.")
      }

      try {
          val intent = Intent(context, OverlayService::class.java).apply {
              putExtra("mode", mode)
          }
          
          // 안드로이드 버전에 따른 서비스 시작 방식 분기
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              context.startForegroundService(intent)
          } else {
              context.startService(intent)
          }
          return@Function true
          
      } catch (e: SecurityException) {
          // [안전장치
