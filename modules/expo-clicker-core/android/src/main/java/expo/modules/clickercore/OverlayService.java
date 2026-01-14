package expo.modules.clickercore;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.graphics.Color;

public class OverlayService extends Service {
    private WindowManager windowManager;
    private FrameLayout overlayView;

    @Override
    public void onCreate() {
        super.onCreate();
        
        // 안드로이드 16 필수: 포그라운드 알림 채널 및 실행 보고
        String CHANNEL_ID = "clicker_service_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "클릭커 서비스", NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);

            Notification notification = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("서버시간 클릭커 작동 중")
                .setContentText("오버레이 버튼이 활성화되었습니다.")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
            
            // 이 호출이 없으면 안드로이드 16에서 앱이 즉시 종료됨
            startForeground(1, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.LEFT;
        params.x = 100;
        params.y = 300;

        overlayView = new FrameLayout(this);
        Button btn = new Button(this);
        btn.setText("지정");
        btn.setBackgroundColor(Color.BLUE);
        btn.setTextColor(Color.WHITE);
        overlayView.addView(btn);

        windowManager.addView(overlayView, params);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) windowManager.removeView(overlayView);
    }
}
