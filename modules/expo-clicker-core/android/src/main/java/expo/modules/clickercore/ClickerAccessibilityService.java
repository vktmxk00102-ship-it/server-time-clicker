package expo.modules.clickercore

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent

class ClickerAccessibilityService : AccessibilityService() {
    companion object {
        var instance: ClickerAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (SharedData.isCaptureMode && event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            SharedData.capturedId = event.source?.viewIdResourceName
            SharedData.isCaptureMode = false
        }
    }

    fun performClickAt(x: Float, y: Float) {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0, 10)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        dispatchGesture(gesture, null, null)
    }

    override fun onInterrupt() {
        instance = null
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }
}
