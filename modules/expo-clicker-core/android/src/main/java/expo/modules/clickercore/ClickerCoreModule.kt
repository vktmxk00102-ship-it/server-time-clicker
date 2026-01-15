package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri

class ClickerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerModule")

    // 1. 오버레이 서비스 제어
    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, OverlayService::class.java).apply {
        action = "SHOW_OVERLAY"
        putExtra("mode", mode)
      }
      context.startService(intent)
      true
    }

    Function("hideOverlay") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, OverlayService::class.java))
      true
    }

    // 2. 좌표 및 ID 캡처 상태 업데이트
    Function("updateTargetCoords") { x: Float, y: Float ->
      SharedData.targetX = x
      SharedData.targetY = y
      true
    }

    Function("startIdCapture") {
      SharedData.isCaptureMode = true
      true
    }

    Function("stopIdCapture") {
      SharedData.isCaptureMode = false
      true
    }

    // 3. 실제 클릭 실행 (JS에서 호출하는 핵심 함수)
    Function("performClickAt") { x: Float, y: Float ->
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      true
    }

    // 4. 권한 설정창 열기
    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }
  }
}

object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
