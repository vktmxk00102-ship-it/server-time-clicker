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
import android.widget.FrameLayout
import android.widget.LinearLayout

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var crosshairView: View? = null
    private var moveButton: View? = null
    private var pipMenuView: View? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mode = intent?.getStringExtra("mode") ?: "LOCATION"
        
        // 기존 뷰 초기화
        removeAllViews()

        if (mode == "LOCATION") {
            showLocationUI()
        } else if (mode == "ID") {
            showPipUI()
        } else if (mode == "HIDE") {
            stopSelf() // 즉시 은신 모드
        }
        
        return START_STICKY
    }

    // [방식 1] 위치 지정 UI (십자선 + 스마트 이동 버튼)
    private fun showLocationUI() {
        // 1. 십자선 가이드 (터치 불가 레이어)
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
                canvas.drawCircle(cx, cy, 25f, paint) // 중앙 원
                canvas.drawLine(0f, cy, width.toFloat(), cy, paint) // 가로선
                canvas.drawLine(cx, 0f, cx, height.toFloat(), paint) // 세로선
            }
        }
        windowManager.addView(crosshairView, crossParams)

        // 2. 스마트 이동 버튼
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
                    
                    // 스마트 회피 알고리즘 적용
                    applySmartAvoidance(btnParams, rawX, rawY)
                    windowManager.updateViewLayout(v, btnParams)
                    
                    // 십자선 중심 좌표 업데이트 (화면 중앙 고정이 아닌 버튼 위치를 타겟으로 할 경우)
                    SharedData.targetX = rawX
                    SharedData.targetY = rawY
                }
                true
            }
        }
        windowManager.addView(moveButton, btnParams)
    }

    // 스마트 회피: 타겟 지점(touchX, touchY)과 버튼이 겹치지 않게 오프셋 부여
    private fun applySmartAvoidance(params: WindowManager.LayoutParams, x: Float, y: Float) {
        val screenW = resources.displayMetrics.widthPixels
        val screenH = resources.displayMetrics.heightPixels

        params.x = x.toInt() - 60
        params.y = y.toInt() - 60

        // 사분면 체크 후 반대 방향으로 밀어내기
        if (x < screenW / 2 && y < screenH / 2) { // 좌상단
            params.x += 150; params.y += 150
        } else if (x > screenW / 2 && y > screenH / 2) { // 우하단
            params.x -= 150; params.y -= 150
        }
    }

    // [방식 2] 객체 지정 UI (PIP 메뉴)
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
            startForeground(1, Notification.Builder(this, channelId)
                .setContentTitle("서버시간 클릭커").setSmallIcon(android.R.drawable.ic_dialog_info).build())
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        removeAllViews()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
