package expo.modules.clickercore

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotification() // 안드로이드 14+ 필수 포그라운드 알림
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        showLocationOverlay()
        return START_NOT_STICKY
    }

    private fun showLocationOverlay() {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        val inflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        // 직접 뷰 생성 (레이아웃 파일 없이 코드로만 구성)
        val root = FrameLayout(this)
        
        // 1. 십자선 이미지 (중앙 고정)
        val crosshair = ImageView(this).apply {
            // 여기에 십자선 리소스가 없다면 임시로 작은 원이나 텍스트로 대체 가능
            setBackgroundColor(Color.RED) 
            layoutParams = FrameLayout.LayoutParams(60, 60, Gravity.CENTER)
        }

        // 2. 완료 버튼 (하단)
        val doneButton = Button(this).apply {
            text = "위치 지정 완료"
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            ).apply { setMargins(0, 0, 0, 100) }
            
            setOnClickListener {
                // 현재 십자선의 중앙 좌표 계산
                val location = IntArray(2)
                crosshair.getLocationOnScreen(location)
                SharedData.targetX = location[0] + (crosshair.width / 2).toFloat()
                SharedData.targetY = location[1] + (crosshair.height / 2).toFloat()
                
                stopSelf() // 오버레이 닫기
            }
        }

        root.addView(crosshair)
        root.addView(doneButton)
        
        // 전체 화면 드래그 이동 로직 (필요시 추가)
        overlayView = root
        windowManager.addView(overlayView, params)
    }

    private fun createNotification() {
        val channelId = "overlay_service"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Overlay", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId).setContentTitle("위치 지정 중").build()
        } else {
            Notification.Builder(this).setContentTitle("위치 지정 중").build()
        }
        startForeground(1, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        overlayView?.let { windowManager.removeView(it) }
    }
}
