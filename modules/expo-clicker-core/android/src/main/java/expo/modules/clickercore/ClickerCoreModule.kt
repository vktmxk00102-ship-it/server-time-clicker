package expo.modules.clickercore

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ClickerCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    // JavaScript에서 불러올 이름
    Name("ClickerCore")

    // 1. 오버레이 시작 함수
    Function("startOverlay") {
      // reactContext가 있을 때만 실행하도록 안전하게 처리
      appContext.reactContext?.let { context ->
        if (!Settings.canDrawOverlays(context)) {
          val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(intent)
        } else {
          val intent = Intent(context, OverlayService::class.java)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
          } else {
            context.startService(intent)
          }
        }
      }
    }

    // 2. 접근성 설정 화면 열기
    Function("openAccessibilitySettings") {
      appContext.reactContext?.let { context ->
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }
  }
}
