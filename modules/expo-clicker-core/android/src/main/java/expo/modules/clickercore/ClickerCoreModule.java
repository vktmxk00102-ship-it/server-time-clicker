// modules/expo-clicker-core/android/ClickerCoreModule.java 내부 수정
Function("startOverlay", () -> {
    if (!Settings.canDrawOverlays(getContext())) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    } else {
        Intent intent = new Intent(getContext(), OverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent); // 최신 안드로이드 방식
        } else {
            getContext().startService(intent);
        }
    }
});
