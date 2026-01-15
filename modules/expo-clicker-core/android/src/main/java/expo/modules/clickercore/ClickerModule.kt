package expo.modules.clickercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings
import android.net.Uri

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

object SharedData {
    var targetX: Float = 0f
    var targetY: Float = 0f
    var isCaptureMode: Boolean = false
    var capturedId: String? = null
}
