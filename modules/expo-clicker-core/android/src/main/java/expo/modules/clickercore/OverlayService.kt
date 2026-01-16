package expo.modules.clickercore

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout

class OverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var overlayView: FrameLayout? = null

    override fun onCreate() {
        super.onCreate()

        // 1. 포그라운드 서비스 알림 설정 (안드로이드 8.0 이상 필수)
        val channelId = "clicker_service_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "클릭커 서비스",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)

            val notification = Notification.Builder(this, channelId)
                .setContentTitle("서버시간 클릭커 작동 중")
                .setContentText("오버레이 버튼이 활성화되었습니다.")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build()

            // 포그라운드 서비스 시작 (안드로이드 14+ 대응)
            startForeground(1, notification)
        }

        // 2. 윈도우 매니저 설정
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.TOP or Gravity.LEFT
        params.x = 100
        params.y = 300

        // 3. 오버레이 뷰 및 버튼 생성
        overlayView = FrameLayout(this)
        val btn = Button(this).apply {
            text = "지정"
            setBackgroundColor(Color.BLUE)
            setTextColor(Color.WHITE)
        }
        overlayView?.addView(btn)

        // 4. 화면에 추가
        windowManager?.addView(overlayView, params)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
        }
    }
}
