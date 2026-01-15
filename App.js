import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  NativeModules,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Settings, RefreshCw, Plus, Minus } from 'lucide-react-native';

const { ClickerModule } = NativeModules; // 빌드된 네이티브 모듈
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SITES = [
  { label: '직접 입력', value: 'custom' },
  { label: '네이버', value: 'https://www.naver.com' },
  { label: '인터파크', value: 'https://www.interpark.com' },
  { label: '멜론티켓', value: 'https://ticket.melon.com' },
  { label: '예스24', value: 'https://www.yes24.com' },
  { label: '티켓링크', value: 'https://www.ticketlink.co.kr' },
];

export default function App() {
  // --- [상태 관리: 서버 시간] ---
  const [selectedSite, setSelectedSite] = useState('custom');
  const [urlInput, setUrlInput] = useState('');
  const [appliedUrl, setAppliedUrl] = useState('');
  const [serverTime, setServerTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);

  // --- [상태 관리: 목표 시간] ---
  const [targetH, setTargetH] = useState('00');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');
  const [isPlus, setIsPlus] = useState(true);

  // --- [상태 관리: 실행 모드 및 오버레이] ---
  const [activeMode, setActiveMode] = useState(null); // 'POSITION' or 'OBJECT'
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isSelectingObject, setIsSelectingObject] = useState(false);

  // --- [애니메이션: 십자선 위치] ---
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 })).current;
  const [currentPos, setCurrentPos] = useState({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });

  // 1. 서버 시간 실시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date(Date.now() + timeOffset));
    }, 100);
    return () => clearInterval(timer);
  }, [timeOffset]);

  // 2. 서버 시간 동기화 (Latency 보정 포함)
  const syncServerTime = async () => {
    if (!urlInput.startsWith('http')) {
      Alert.alert("알림", "URL을 확인해주세요.");
      return;
    }
    const start = Date.now();
    try {
      const response = await fetch(urlInput, { method: 'HEAD', cache: 'no-store' });
      const serverDateStr = response.headers.get('Date');
      if (serverDateStr) {
        const end = Date.now();
        const latency = (end - start) / 2;
        const offset = new Date(serverDateStr).getTime() + latency - end;
        setTimeOffset(offset);
        setAppliedUrl(urlInput);
        Alert.alert("동기화 완료", `오차 ${offset}ms가 적용되었습니다.`);
      }
    } catch (e) {
      Alert.alert("에러", "서버 시간을 가져올 수 없습니다.");
    }
  };

  // 3. 목표 시간 빠른 설정
  const copyTime = (type) => {
    const cur = new Date(Date.now() + timeOffset);
    let h = cur.getHours(), m = cur.getMinutes(), s = 0;
    if (type === 'NOW') s = cur.getSeconds();
    else if (type === '30MIN') { m < 30 ? m = 30 : (m = 0, h = (h + 1) % 24); }
    else if (type === 'HOUR') { m = 0, h = (h + 1) % 24; }
    setTargetH(h.toString().padStart(2, '0'));
    setTargetM(m.toString().padStart(2, '0'));
    setTargetS(s.toString().padStart(2, '0'));
  };

  // 4. 목표 시간 미세 조정
  const adjust = (unit, amount) => {
    const sign = isPlus ? 1 : -1;
    const val = amount * sign;
    if (unit === 'H') {
      let res = (parseInt(targetH) + val) % 24;
      setTargetH((res < 0 ? res + 24 : res).toString().padStart(2, '0'));
    } else if (unit === 'M') {
      let res = (parseInt(targetM) + val) % 60;
      setTargetM((res < 0 ? res + 60 : res).toString().padStart(2, '0'));
    } else if (unit === 'S') {
      let res = (parseInt(targetS) + val) % 60;
      setTargetS((res < 0 ? res + 60 : res).toString().padStart(2, '0'));
    }
  };

  // 5. 십자선 드래그 제어 (1번 방식)
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

  // 6. 오버레이 실행 및 모드 전환
  const toggleOverlay = (mode) => {
    if (isOverlayVisible && activeMode === mode) {
      setIsOverlayVisible(false);
      ClickerModule.hideOverlay();
    } else {
      setActiveMode(mode);
      setIsOverlayVisible(true);
      ClickerModule.showOverlay(mode);
    }
  };

  // 십자선 위치에 따른 이동 버튼 스마트 배치
  const getMoveBtnPos = () => {
    const isTopLeft = currentPos.x < SCREEN_WIDTH / 2 && currentPos.y < SCREEN_HEIGHT / 2;
    return isTopLeft ? { bottom: 100, right: 30 } : { top: 100, left: 30 };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 100}}>
      <Text style={styles.headerTitle}>PRO 티켓팅 클릭커</Text>

      {/* --- 서버 시간 섹션 --- */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>실시간 서버 시간</Text>
        <Text style={styles.timeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
        <View style={styles.urlRow}>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedSite} onValueChange={(v) => {setSelectedSite(v); if(v!=='custom') setUrlInput(v);}}>
              {SITES.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} style={{fontSize: 12}}/>)}
            </Picker>
          </View>
          <TextInput style={styles.urlInput} value={urlInput} onChangeText={setUrlInput} placeholder="https://" />
          <TouchableOpacity style={[styles.syncBtn, urlInput === appliedUrl && styles.btnDisabled]} onPress={syncServerTime} disabled={urlInput === appliedUrl}>
            <Text style={styles.syncBtnText}>{urlInput === appliedUrl ? '완료' : '적용'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 목표 시간 설정 섹션 --- */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>목표 시간 설정</Text>
          <View style={styles.copyRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTime('NOW')}><Text style={styles.copyText}>서버시간</Text></TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTime('30MIN')}><Text style={styles.copyText}>30분</Text></TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTime('HOUR')}><Text style={styles.copyText}>정각</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.targetInputRow}>
          {[ {id:'H', v:targetH, s:setTargetH}, {id:'M', v:targetM, s:setTargetM}, {id:'S', v:targetS, s:setTargetS} ].map((t, i) => (
            <React.Fragment key={t.id}>
              <View style={styles.timeBox}>
                <TextInput style={styles.timeInput} value={t.v} onChangeText={t.s} keyboardType="numeric" maxLength={2} />
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

      {/* --- 실행 모드 선택 섹션 --- */}
      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeCard, activeMode === 'POSITION' && styles.activeModeCard]} onPress={() => toggleOverlay('POSITION')}>
          <Crosshair size={32} color={activeMode === 'POSITION' ? '#FFF' : '#007AFF'} />
          <Text style={[styles.modeLabel, activeMode === 'POSITION' && styles.activeModeLabel]}>위치 지정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeCard, activeMode === 'OBJECT' && styles.activeModeCard]} onPress={() => toggleOverlay('OBJECT')}>
          <MousePointerClick size={32} color={activeMode === 'OBJECT' ? '#FFF' : '#28A745'} />
          <Text style={[styles.modeLabel, activeMode === 'OBJECT' && styles.activeModeLabel]}>객체 지정</Text>
        </TouchableOpacity>
      </View>

      {/* --- 오버레이 UI 미리보기 (실제 실행 시 네이티브에서 표시) --- */}
      {isOverlayVisible && (
        <View style={styles.overlayLayer} pointerEvents="box-none">
          {activeMode === 'POSITION' ? (
            <>
              <Animated.View style={[styles.vLine, { left: pan.x }]} />
              <Animated.View style={[styles.hLine, { top: pan.y }]} />
              <Animated.View style={[styles.guideCircle, { left: Animated.add(pan.x, -15), top: Animated.add(pan.y, -15) }]} />
              <Animated.View {...panResponder.panHandlers} style={[styles.moveFloatingBtn, getMoveBtnPos()]}>
                <Crosshair color="#FFF" size={18} />
                <Text style={styles.moveFloatingText}>이동</Text>
              </Animated.View>
            </>
          ) : (
            <View style={styles.pipContainer}>
              <TouchableOpacity style={[styles.pipBtn, isSelectingObject && styles.pipBtnActive]} onPress={() => {setIsSelectingObject(true); ClickerModule.startIdCapture();}}>
                <Text style={styles.pipText}>선택</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pipBtn, !isSelectingObject && styles.pipBtnActive]} onPress={() => {setIsSelectingObject(false); ClickerModule.stopIdCapture();}}>
                <Text style={styles.pipText}>해제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pipBtn} onPress={() => {setIsOverlayVisible(false); ClickerModule.openSettings();}}>
                <Settings color="#FFF" size={16} />
                <Text style={styles.pipText}>설정</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 45, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
  cardLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 5, textAlign: 'center' },
  timeText: { fontSize: 34, fontWeight: 'bold', textAlign: 'center', color: '#1C1C1E' },
  msText: { fontSize: 20, color: '#007AFF' },
  urlRow: { flexDirection: 'row', marginTop: 15, height: 45 },
  pickerWrapper: { flex: 1.2, backgroundColor: '#E5E5EA', borderRadius: 8, marginRight: 5, justifyContent: 'center' },
  urlInput: { flex: 2, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, paddingHorizontal: 10, marginRight: 5 },
  syncBtn: { flex: 0.8, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { backgroundColor: '#C7C7CC' },
  syncBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  copyRow: { flexDirection: 'row' },
  copyBtn: { backgroundColor: '#E5E5EA', padding: 6, borderRadius: 6, marginLeft: 4 },
  copyText: { fontSize: 10, fontWeight: '600' },
  targetInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  timeBox: { alignItems: 'center' },
  timeInput: { backgroundColor: '#F2F2F7', width: 60, height: 50, borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
  adjRow: { flexDirection: 'row', marginTop: 5 },
  adjBtn: { backgroundColor: '#8E8E93', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginHorizontal: 1 },
  adjText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 5, marginTop: 10 },
  pmBtn: { marginLeft: 10, width: 45, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pmText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modeCard: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
  activeModeCard: { backgroundColor: '#007AFF' },
  modeLabel: { marginTop: 10, fontWeight: 'bold', color: '#007AFF' },
  activeModeLabel: { color: '#FFF' },
  overlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
  vLine: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'red' },
  hLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'red' },
  guideCircle: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'red' },
  moveFloatingBtn: { position: 'absolute', backgroundColor: '#1C1C1E', flexDirection: 'row', padding: 12, borderRadius: 25, alignItems: 'center', elevation: 10 },
  moveFloatingText: { color: '#FFF', marginLeft: 5, fontWeight: 'bold' },
  pipContainer: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'row', padding: 10, borderRadius: 30 },
  pipBtn: { paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  pipBtnActive: { backgroundColor: '#007AFF' },
  pipText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }
});
