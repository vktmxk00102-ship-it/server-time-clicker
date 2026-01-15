import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  Dimensions, Animated, PanResponder, NativeModules, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Settings, Zap, Play, Square } from 'lucide-react-native';

const { ClickerModule } = NativeModules;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  // --- [상태 관리: 서버 및 목표 시간] ---
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  const [targetH, setTargetH] = useState('00');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');
  const [isPlus, setIsPlus] = useState(true);

  // --- [상태 관리: 보정 모드 (추가)] ---
  const [isCompEnabled, setIsCompEnabled] = useState(false);
  const [compValue, setCompValue] = useState('0.05'); // 단위: 초 (예: 0.05초 미리 클릭)

  // --- [상태 관리: 실행 및 오버레이] ---
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 })).current;
  const [currentPos, setCurrentPos] = useState({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });

  // 1. 서버 시간 실시간 업데이트 & 실행 감시 로직
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now() + timeOffset;
      const curDate = new Date(now);
      setServerTime(curDate);

      // 실행 중일 때 시간 체크
      if (isRunning) {
        checkAndExecute(now);
      }
    }, 10); // 0.01초 단위 정밀 감시
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 2. 시간 체크 및 클릭 실행 (방식 A)
  const checkAndExecute = (nowMs) => {
    const targetDate = new Date(serverTime);
    targetDate.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
    
    let executeTime = targetDate.getTime();
    if (isCompEnabled) {
      executeTime -= (parseFloat(compValue) * 1000); // 보정 시간(ms) 차감
    }

    if (nowMs >= executeTime) {
      // [발사] 네이티브 클릭 실행
      ClickerModule.performClickAt(currentPos.x, currentPos.y);
      
      // [방식 A] 실행 후 종료 및 십자선 숨기기
      setIsRunning(false);
      setIsOverlayVisible(false);
      setActiveMode(null);
      ClickerModule.hideOverlay();
      Alert.alert("실행 완료", "목표 시간에 도달하여 클릭 후 종료되었습니다.");
    }
  };

  // 3. 십자선 드래그 제어
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gs) => {
        pan.setValue({ x: gs.moveX, y: gs.moveY });
        setCurrentPos({ x: Math.round(gs.moveX), y: Math.round(gs.moveY) });
      },
      onPanResponderRelease: () => {
        ClickerModule.updateTargetCoords(currentPos.x, currentPos.y);
      }
    })
  ).current;

  // 나머지 함수들 (syncServerTime, copyTime, adjust 등은 이전과 동일)
  const syncServerTime = async () => { /* ...기존과 동일... */ };
  const copyTime = (type) => { /* ...기존과 동일... */ };
  const adjust = (u, a) => { /* ...기존과 동일... */ };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 100}}>
      <Text style={styles.headerTitle}>PRO 티켓팅 클릭커</Text>

      {/* --- 현재 서버 시간 카드 --- */}
      <View style={styles.card}>
        <Text style={styles.timeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      {/* --- 보정 설정 섹션 (1번 요구사항) --- */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Zap size={18} color="#FF9500" />
            <Text style={styles.sectionTitle}> 보정 모드 (선입력)</Text>
          </View>
          <Switch value={isCompEnabled} onValueChange={setIsCompEnabled} />
        </View>
        {isCompEnabled && (
          <View style={styles.compInputRow}>
            <Text style={styles.compLabel}>보정 시간:</Text>
            <TextInput 
              style={styles.compInput} 
              value={compValue} 
              onChangeText={setCompValue} 
              keyboardType="numeric"
              placeholder="0.05"
            />
            <Text style={styles.compUnit}>초 전 클릭</Text>
          </View>
        )}
      </View>

      {/* --- 목표 시간 설정 및 조정 섹션 --- */}
      <View style={styles.card}>
        <View style={styles.targetInputRow}>
          {[ {id:'H', v:targetH, s:setTargetH}, {id:'M', v:targetM, s:setTargetM}, {id:'S', v:targetS, s:setTargetS} ].map((t, i) => (
            <React.Fragment key={t.id}>
              <View style={styles.timeBox}>
                <TextInput style={styles.timeInput} value={t.v} onChangeText={t.s} keyboardType="numeric" />
                <View style={styles.adjRow}>
                  <TouchableOpacity style={styles.adjBtn} onPress={() => adjust(t.id, 10)}><Text style={styles.adjText}>10</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.adjBtn} onPress={() => adjust(t.id, 1)}><Text style={styles.adjText}>1</Text></TouchableOpacity>
                </View>
              </View>
              {i < 2 && <Text style={styles.colon}>:</Text>}
            </React.Fragment>
          ))}
          <TouchableOpacity style={[styles.pmBtn, {backgroundColor: isPlus ? '#FF3B30' : '#007AFF'}]} onPress={() => setIsPlus(!isPlus)}>
            <Text style={styles.pmText}>{isPlus ? '+' : '-'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 실행 버튼 (발사 준비) --- */}
      <TouchableOpacity 
        style={[styles.mainStartBtn, isRunning && styles.mainStopBtn]} 
        onPress={() => setIsRunning(!isRunning)}
      >
        {isRunning ? <Square color="#FFF" fill="#FFF" /> : <Play color="#FFF" fill="#FFF" />}
        <Text style={styles.mainStartBtnText}>{isRunning ? ' 대기 취소' : ' 티켓팅 시작 대기'}</Text>
      </TouchableOpacity>

      {/* --- 오버레이 미리보기 --- */}
      {isOverlayVisible && activeMode === 'POSITION' && (
        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Animated.View style={[styles.vLine, { left: pan.x }]} />
          <Animated.View style={[styles.hLine, { top: pan.y }]} />
          <Animated.View style={[styles.guideCircle, { left: Animated.add(pan.x, -15), top: Animated.add(pan.y, -15) }]} />
          <Animated.View {...panResponder.panHandlers} style={styles.moveFloatingBtn}>
            <Crosshair color="#FFF" size={18} /><Text style={styles.moveFloatingText}>이동</Text>
          </Animated.View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 40, marginBottom: 15, textAlign: 'center' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2 },
  timeText: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  msText: { fontSize: 18, color: '#007AFF' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  compInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#F2F2F7', padding: 10, borderRadius: 8 },
  compLabel: { fontSize: 14, color: '#444' },
  compInput: { backgroundColor: '#FFF', width: 60, height: 35, borderRadius: 5, textAlign: 'center', marginHorizontal: 10, borderWidth: 1, borderColor: '#DDD', fontWeight: 'bold' },
  compUnit: { fontSize: 14, color: '#666' },
  targetInputRow: { flexDirection: 'row', justifyContent: 'center' },
  timeBox: { alignItems: 'center' },
  timeInput: { backgroundColor: '#F2F2F7', width: 60, height: 50, borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
  adjRow: { flexDirection: 'row', marginTop: 5 },
  adjBtn: { backgroundColor: '#8E8E93', paddingHorizontal: 5, borderRadius: 4, marginHorizontal: 1 },
  adjText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 5, marginTop: 10 },
  pmBtn: { marginLeft: 10, width: 45, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pmText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  mainStartBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  mainStopBtn: { backgroundColor: '#FF3B30' },
  mainStartBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  overlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
  vLine: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'red' },
  hLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'red' },
  guideCircle: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'red' },
  moveFloatingBtn: { position: 'absolute', bottom: 100, right: 30, backgroundColor: '#1C1C1E', flexDirection: 'row', padding: 12, borderRadius: 25, elevation: 10 },
  moveFloatingText: { color: '#FFF', marginLeft: 5, fontWeight: 'bold' }
});
