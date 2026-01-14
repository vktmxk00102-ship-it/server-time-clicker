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
        
        // 안드로이드 12~16 필수: 포그라운드 알림 채널 생성
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("clicker_ch", "Clicker Service", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
            Notification notification = new Notification.Builder(this, "clicker_ch")
                .setContentTitle("클릭커 실행 중")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .build();
            startForeground(1, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.LEFT;

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
}
