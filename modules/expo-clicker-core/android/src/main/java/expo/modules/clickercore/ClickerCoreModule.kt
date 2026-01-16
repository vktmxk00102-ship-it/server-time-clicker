package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.os.Build

// [핵심 해결 2] 클래스 이름을 JSON 설정(ClickerCoreModule)과 똑같이 변경
class ClickerCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    // [핵심 해결 3] 모듈 이름도 통일
    Name("ClickerCoreModule")

    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, OverlayService::class.java).apply {
        action = "SHOW_OVERLAY"
        putExtra("mode", mode)
      }
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
      } else {
          context.startService(intent)
      }
      return@Function true
    }

    Function("hideOverlay") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, OverlayService::class.java))
      return@Function true
    }

    Function("updateTargetCoords") { x: Float, y: Float ->
      SharedData.targetX = x
      SharedData.targetY = y
      return@Function true
    }

    Function("performClickAt") { x: Float, y: Float ->
      // 임포트를 명시했으므로 이제 무조건 찾습니다
      ClickerAccessibilityService.instance?.performClickAt(x, y)
      return@Function true
    }

    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function true
    }
    
    Function("startIdCapture") { SharedData.isCaptureMode = true; return@Function true }
    Function("stopIdCapture") { SharedData.isCaptureMode = false; return@Function true }
  }
}

// SharedData는 이 파일에 그대로 유지
object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
