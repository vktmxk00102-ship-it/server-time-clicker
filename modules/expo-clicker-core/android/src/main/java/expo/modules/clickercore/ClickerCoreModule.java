package expo.modules.clickercore;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import expo.modules.kotlin.modules.Module;
import expo.modules.kotlin.modules.ModuleDefinition;

public class ClickerCoreModule extends Module {
  @Override
  public ModuleDefinition definition() {
    // JavaScript에서 import ClickerCore from 'expo-clicker-core'로 부를 이름
    Name("ClickerCore");

    // 1. 오버레이(다른 앱 위에 그리기) 및 서비스 시작 함수
    Function("startOverlay", () -> {
        // 권한 체크
        if (!Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } else {
            // 권한이 있으면 서비스 시작
            Intent intent = new Intent(getContext(), OverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // 안드로이드 8.0 이상 및 16 대응: 포그라운드 서비스로 시작
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
        }
    });

    // 2. 접근성 설정 화면 열기 함수 (타겟 앱 클릭 권한용)
    Function("openAccessibilitySettings", () -> {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    });

    return new ModuleDefinition();
  }
}
