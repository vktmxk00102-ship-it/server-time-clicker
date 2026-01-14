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

    Function("startOverlay", () -> {
        if (!Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } else {
            Intent intent = new Intent(getContext(), OverlayService.class);
            getContext().startService(intent);
        }
    });

    Function("openAccessibilitySettings", () -> {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    });

    return new ModuleDefinition();
  }
}
