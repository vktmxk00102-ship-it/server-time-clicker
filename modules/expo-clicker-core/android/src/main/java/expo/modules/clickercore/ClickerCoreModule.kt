package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri
import android.content.Context

class ClickerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClickerModule")

    Function("showOverlay") { mode: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, OverlayService::class.java).apply {
        action = "SHOW_OVERLAY"
        putExtra("mode", mode)
      }
      context.startService(intent)
      true // 성공 반환
    }

    Function("hideOverlay") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, OverlayService::class.java))
      true
    }

    Function("updateTargetCoords") { x: Int, y: Int ->
      SharedData.targetX = x
      SharedData.targetY = y
      true
    }

    Function("startIdCapture") {
      SharedData.isCaptureMode = true
      true // Any? 타입을 만족시키기 위해 추가
    }

    Function("stopIdCapture") {
      SharedData.isCaptureMode = false
      true
    }

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
    var targetX: Int = 0
    var targetY: Int = 0
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
