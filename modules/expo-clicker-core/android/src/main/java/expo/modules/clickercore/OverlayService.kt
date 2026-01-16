package expo.modules.clickercore

import android.app.*
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.*
import android.widget.*
import android.content.pm.ServiceInfo
import android.os.Build
import android.graphics.drawable.GradientDrawable

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var rootLayout: FrameLayout? = null
    private var crosshairContainer: FrameLayout? = null
    private var params = WindowManager.LayoutParams()
    private var lastX: Int = 0
    private var lastY: Int = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (rootLayout == null) setupOverlay()
        return START_NOT_STICKY
    }

    private fun setupOverlay() {
        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.START; x = 200; y = 400 }

        rootLayout = FrameLayout(this)
        crosshairContainer = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(400, 400)
            addView(View(this@OverlayService).apply { setBackgroundColor(Color.RED); layoutParams = FrameLayout.LayoutParams(400, 2, Gravity.CENTER) })
            addView(View(this@OverlayService).apply { setBackgroundColor(Color.RED); layoutParams = FrameLayout.LayoutParams(2, 400, Gravity.CENTER) })
            addView(View(this@OverlayService).apply { background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setStroke(3, Color.RED) }; layoutParams = FrameLayout.LayoutParams(60, 60, Gravity.CENTER) })
        }

        crosshairContainer?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { lastX = event.rawX.toInt(); lastY = event.rawY.toInt(); true }
                MotionEvent.ACTION_MOVE -> {
                    params.x += (event.rawX.toInt() - lastX); params.y += (event.rawY.toInt() - lastY)
                    windowManager.updateViewLayout(rootLayout, params)
                    lastX = event.rawX.toInt(); lastY = event.rawY.toInt(); true
                }
                else -> false
            }
        }

        val menu = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = FrameLayout.LayoutParams(-2, -2, Gravity.TOP or Gravity.END).apply { setMargins(0, 40, 40, 0) }
        }

        val btnFix = Button(this).apply {
            text = "지정"; setTextColor(Color.WHITE); setBackgroundColor(Color.RED)
            layoutParams = LinearLayout.LayoutParams(150, 90).apply { setMargins(10,0,0,0) }
            setOnClickListener {
                if (text == "지정") {
                    crosshairContainer?.visibility = View.GONE
                    SharedData.targetX = params.x + 200f; SharedData.targetY = params.y + 200f
                    text = "해제"; setBackgroundColor(Color.GRAY)
                } else {
                    crosshairContainer?.visibility = View.VISIBLE
                    text = "지정"; setBackgroundColor(Color.RED)
                }
            }
        }

        val btnApp = Button(this).apply {
            text = "설정"; setTextColor(Color.WHITE); setBackgroundColor(Color.DKGRAY)
            layoutParams = LinearLayout.LayoutParams(150, 90).apply { setMargins(10,0,0,0) }
            setOnClickListener {
                val intent = packageManager.getLaunchIntentForPackage(packageName)
                intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(intent)
            }
        }

        menu.addView(btnFix); menu.addView(btnApp)
        rootLayout?.addView(crosshairContainer); rootLayout?.addView(menu)
        windowManager.addView(rootLayout, params)
    }

    private fun createNotification() {
        val chan = NotificationChannel("ovl", "Overlay", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(chan)
        val builder = Notification.Builder(this, "ovl").setContentTitle("조준 중").setSmallIcon(android.R.drawable.stat_notify_sync)
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1, builder.build())
    }

    override fun onDestroy() { super.onDestroy(); rootLayout?.let { windowManager.removeView(it) } }
}
