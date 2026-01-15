package expo.modules.clickercore

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent

class ClickerAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // [객체 지정 모드] 사용자가 터치한 요소의 ID 추출
        if (SharedData.isCaptureMode && event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val nodeInfo = event.source
            SharedData.capturedId = nodeInfo?.viewIdResourceName
            // 추출 후 모드 자동 해제
            SharedData.isCaptureMode = false
        }
    }

    // 실제 클릭 수행 함수 (자바스크립트 타이머에 의해 호출됨)
    fun performClickAt(x: Float, y: Float) {
        val path = Path().apply { moveTo(x, y) }
        val builder = GestureDescription.Builder()
        builder.addStroke(GestureDescription.StrokeDescription(path, 0, 10))
        dispatchGesture(builder.build(), null, null)
    }

    override fun onInterrupt() {}
}
