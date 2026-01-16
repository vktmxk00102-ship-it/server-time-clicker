package expo.modules.clickercore

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ClickerAccessibilityService : AccessibilityService() {
    companion object {
        var instance: ClickerAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // 객체 지정 모드: 터치한 뷰의 ID 캡처
        if (SharedData.isCaptureMode && event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val nodeInfo = event.source
            SharedData.capturedId = nodeInfo?.viewIdResourceName
            SharedData.isCaptureMode = false
        }
    }

    fun performClickAt(x: Float, y: Float) {
        // 1. ID가 저장되어 있다면 ID로 클릭 시도 (객체 지정)
        if (SharedData.capturedId != null) {
            val rootNode = rootInActiveWindow
            val nodes = rootNode?.findAccessibilityNodeInfosByViewId(SharedData.capturedId!!)
            if (!nodes.isNullOrEmpty()) {
                nodes[0].performAction(AccessibilityNodeInfo.ACTION_CLICK)
                SharedData.capturedId = null
                return
            }
        }

        // 2. ID가 없거나 실패하면 좌표로 클릭 (위치 지정)
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0, 10)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        dispatchGesture(gesture, null, null)
    }

    override fun onInterrupt() { instance = null }
    override fun onDestroy() { instance = null }
}
