package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.view.accessibility.AccessibilityManager
import android.content.Context

class ClickerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerModule")

    // 1. 오버레이(PIP) 표시/숨기기
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, OverlayService::class.java).apply {
        action = "SHOW_OVERLAY"
        putExtra("mode", mode)
      }
      context.startService(intent)
    }

    Function("hideOverlay") {
      val context = appContext.reactContext ?: return@Function
      context.stopService(Intent(context, OverlayService::class.java))
    }

    // 2. 자바스크립트에서 받은 좌표 업데이트
    Function("updateTargetCoords") { x: Int, y: Int ->
      // 전역 변수나 서비스를 통해 좌표 저장
      SharedData.targetX = x
      SharedData.targetY = y
    }

    // 3. 버튼 ID 캡처 시작/종료
    Function("startIdCapture") {
      SharedData.isCaptureMode = true
    }

    Function("stopIdCapture") {
      SharedData.isCaptureMode = false
    }

    // 4. 안드로이드 설정 창 열기 (접근성/오버레이 권한용)
    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}

// 좌표 및 상태 공유용 오브젝트
object SharedData {
    var targetX: Int = 0
    var targetY: Int = 0
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
