package expo.modules.clickercore

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast // [추가] 에러 시 토스트 메시지 표시

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var crosshairView: View? = null
    private var moveButton: View? = null
    private var pipMenuView: View? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        // 알림 채널 생성 (안전하게 처리)
        try {
            createNotification()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mode = intent?.getStringExtra("mode") ?: "LOCATION"
        
        // 기존 뷰 제거
        removeAllViews()

        if (mode == "HIDE") {
            stopSelf()
            return START_NOT_STICKY
        }

        // [핵심] 화면 그리기 시도 (에러 나면 앱 죽는 대신 종료)
        try {
            if (mode == "LOCATION") {
                showLocationUI()
            } else if (mode == "ID") {
                showPipUI()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // 에러 발생 시 토스트 메시지로 원인 알림
            Toast.makeText(this, "오버레이 실행 실패: ${e.message}", Toast.LENGTH_LONG).show()
            stopSelf() // 서비스 안전 종료
        }
        
        return START_STICKY
    }

    private fun showLocationUI() {
        // ... (이전 코드와 동일, 파라미터 설정)
        val crossParams = createLayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            canTouch = false
        )
        crosshairView = object : View(this) {
            private val paint = Paint().apply {
                color = Color.RED
                strokeWidth = 4f
                style = Paint.Style.STROKE
            }
            override fun onDraw(canvas: Canvas) {
                super.onDraw(canvas)
                val cx = width / 2f
                val cy = height / 2f
                canvas.drawCircle(cx, cy, 25f, paint)
                canvas.drawLine(0f, cy, width.toFloat(), cy, paint)
                canvas.drawLine(cx, 0f, cx, height.toFloat(), paint)
            }
        }
        // [안전장치] 뷰 추가
        windowManager.addView(crosshairView, crossParams)

        val btnParams = createLayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.LEFT
            x = 300
            y = 500
        }

        moveButton = Button(this).apply {
            text = "이동"
            setBackgroundColor(Color.parseColor("#EEFF0000"))
            setTextColor(Color.WHITE)
            setPadding(20, 10, 20, 10)
            setOnTouchListener { v, event ->
                if (event.action == MotionEvent.ACTION_MOVE) {
                    val rawX = event.rawX
                    val rawY = event.rawY
                    applySmartAvoidance(btnParams, rawX, rawY)
                    windowManager.updateViewLayout(v, btnParams)
                    SharedData.targetX = rawX
                    SharedData.targetY = rawY
                }
                true
            }
        }
        windowManager.addView(moveButton, btnParams)
    }

    private fun applySmartAvoidance(params: WindowManager.LayoutParams, x: Float, y: Float) {
        val screenW = resources.displayMetrics.widthPixels
        val screenH = resources.displayMetrics.heightPixels
        params.x = x.toInt() - 60
        params.y = y.toInt() - 60
        if (x < screenW / 2 && y < screenH / 2) { params.x += 150; params.y += 150 }
        else if (x > screenW / 2 && y > screenH / 2) { params.x -= 150; params.y -= 150 }
    }

    private fun showPipUI() {
        val params = createLayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER_VERTICAL or Gravity.RIGHT
        }

        pipMenuView = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#AA000000"))
            setPadding(15, 15, 15, 15)

            val btnSelect = Button(context).apply { text = "선택" }
            val btnRelease = Button(context).apply { text = "해제"; isEnabled = false }
            val btnSettings = Button(context).apply { text = "설정" }

            btnSelect.setOnClickListener {
                SharedData.isCaptureMode = true
                isEnabled = false
                btnRelease.isEnabled = true
            }
            btnRelease.setOnClickListener {
                SharedData.isCaptureMode = false
                SharedData.capturedId = null
                isEnabled = false
                btnSelect.isEnabled = true
            }
            btnSettings.setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
                stopSelf()
            }
            addView(btnSelect); addView(btnRelease); addView(btnSettings)
        }
        windowManager.addView(pipMenuView, params)
    }

    private fun removeAllViews() {
        try {
            crosshairView?.let { windowManager.removeView(it) }
            moveButton?.let { windowManager.removeView(it) }
            pipMenuView?.let { windowManager.removeView(it) }
        } catch (e: Exception) {}
        crosshairView = null; moveButton = null; pipMenuView = null
    }

    private fun createLayoutParams(width: Int, height: Int, canTouch: Boolean = true): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
        
        var flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        if (!canTouch) flags = flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE

        return WindowManager.LayoutParams(width, height, type, flags, PixelFormat.TRANSLUCENT)
    }

    private fun createNotification() {
        val channelId = "clicker_service_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "클릭커 서비스", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
            
            val notification = Notification.Builder(this, channelId)
                .setContentTitle("서버시간 클릭커")
                .setContentText("터치하여 설정 열기")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build()
                
            startForeground(1, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        removeAllViews()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
