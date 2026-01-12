package expo.modules.clickercore;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import expo.modules.kotlin.modules.Module;
import expo.modules.kotlin.modules.ModuleDefinition;

public class ClickerCoreModule extends Module {
  @Override
  public ModuleDefinition definition() {
    Name("ClickerCore");

    // PIP 시작 명령
    Function("startOverlay", () -> {
        Intent intent = new Intent(getContext(), OverlayService.class);
        getContext().startService(intent);
    });

    // 접근성 설정 화면 열기
    Function("openAccessibilitySettings", () -> {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    });

    return new ModuleDefinition();
  }
}
