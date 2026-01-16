package expo.modules.clickercore

import android.app.*
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.content.pm.ServiceInfo
import android.os.Build
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var rootLayout: FrameLayout? = null
    private var crosshairContainer: FrameLayout? = null
    private var topMenu: LinearLayout? = null
    
    private var lastX: Int = 0
    private var lastY: Int = 0
    private var params = WindowManager.LayoutParams()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        setupFullOverlay()
        return START_NOT_STICKY
    }

    private fun setupFullOverlay() {
        // 1. 윈도우 파라미터 설정 (터치 이벤트를 받기 위해 FLAG_NOT_FOCUSABLE 유지)
        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 500 // 초기 위치
            y = 800
        }

        rootLayout = FrameLayout(this)

        // 2. 십자선 컨테이너 (이 영역을 드래그하면 이동)
        crosshairContainer = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(400, 400) // 드래그 인식 영역
            
            // 가로 실선
            addView(View(this@OverlayService).apply {
                setBackgroundColor(Color.RED)
                layoutParams = FrameLayout.LayoutParams(400, 2, Gravity.CENTER)
            })
            // 세로 실선
            addView(View(this@OverlayService).apply {
                setBackgroundColor(Color.RED)
                layoutParams = FrameLayout.LayoutParams(2, 400, Gravity.CENTER)
            })
            // 중앙 링
            addView(View(this@OverlayService).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setStroke(3, Color.RED)
                }
                layoutParams = FrameLayout.LayoutParams(60, 60, Gravity.CENTER)
            })
        }

        // 드래그 이동 로직 보완
        crosshairContainer?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    lastX = event.rawX.toInt()
                    lastY = event.rawY.toInt()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.rawX.toInt() - lastX
                    val deltaY = event.rawY.toInt() - lastY
                    params.x += deltaX
                    params.y += deltaY
                    windowManager.updateViewLayout(rootLayout, params)
                    lastX = event.rawX.toInt()
                    lastY = event.rawY.toInt()
                    true
                }
                else -> false
            }
        }

        // 3. 우측 상단 메뉴 (지정/해제, 설정 버튼)
        topMenu = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val menuParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP or Gravity.END
            ).apply { setMargins(0, 50, 50, 0) } // 모서리에서 살짝 띄움
            layoutParams = menuParams
        }

        val btnFix = createMenuButton("지정", "#CC0000")
        val btnSetting = createMenuButton("설정", "#333333")

        btnFix.setOnClickListener {
            if (btnFix.text == "지정") {
                // [지정] 상태: 십자선 숨기고 좌표 저장
                crosshairContainer?.visibility = View.GONE
                SharedData.targetX = (params.x + 200).toFloat() // 컨테이너 절반(200) 보정
                SharedData.targetY = (params.y + 200).toFloat()
                btnFix.text = "해제"
                btnFix.setBackgroundColor(Color.parseColor("#444444"))
            } else {
                // [해제] 상태: 십자선 다시 표시
                crosshairContainer?.visibility = View.VISIBLE
                btnFix.text = "지정"
                btnFix.setBackgroundColor(Color.parseColor("#CC0000"))
            }
        }

        btnSetting.setOnClickListener {
            // 우리 앱으로 돌아가기
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }

        topMenu?.addView(btnFix)
        topMenu?.addView(btnSetting)

        rootLayout?.addView(crosshairContainer)
        rootLayout?.addView(topMenu)
        
        windowManager.addView(rootLayout, params)
    }

    private fun createMenuButton(txt: String, color: String): Button {
        return Button(this).apply {
            text = txt
            textSize = 12f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor(color))
            layoutParams = LinearLayout.LayoutParams(160, 100).apply {
                setMargins(10, 0, 0, 0)
            }
        }
    }

    private fun createNotification() {
        val channelId = "overlay_service"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Overlay", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId).setContentTitle("위치 지정 모드").setSmallIcon(android.R.drawable.ic_menu_mylocation).build()
        } else {
            Notification.Builder(this).setContentTitle("위치 지정 모드").build()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        rootLayout?.let { windowManager.removeView(it) }
    }
}
