import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  Dimensions, Animated, PanResponder, NativeModules, Switch, Platform
} from 'react-native';
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, LogIn } from 'lucide-react-native';

// 네이티브 모듈 이름 확인: ClickerCoreModule (Android에서 정의한 이름)
const { ClickerCoreModule } = NativeModules;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  // --- [상태 관리: 서버 및 목표 시간] ---
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  const [targetH, setTargetH] = useState('20'); // 기본값 20시 (티켓팅 시간)
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');
  const [targetUrl, setTargetUrl] = useState('https://www.naver.com');

  // --- [상태 관리: 보정 모드] ---
  const [isCompEnabled, setIsCompEnabled] = useState(true);
  const [compValue, setCompValue] = useState('0.05'); // 0.05초 선입력

  // --- [상태 관리: 실행 모드] ---
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null); // 'LOCATION' or 'ID'
  const [capturedId, setCapturedId] = useState(null);

  // 1. 서버 시간 동기화 (네이티브 AsyncFunction 활용)
  const syncServerTime = async () => {
    try {
      // 네이티브에서 네트워크 지연시간(Latency)을 계산한 오프셋을 가져옴
      const offset = await ClickerCoreModule.getServerTimeOffset(targetUrl);
      setTimeOffset(offset);
      Alert.alert("동기화 완료", `서버와의 오차: ${offset.toFixed(3)}ms`);
    } catch (e) {
      Alert.alert("오류", "서버 시간을 가져올 수 없습니다.");
    }
  };

  // 2. 실시간 시계 및 실행 감시 (0.001초 정밀도)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      setServerTime(new Date(nowMs));

      if (isRunning) {
        checkAndExecute(nowMs);
      }
    }, 1); // 1ms 단위 체크
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 3. 목표 시간 체크 및 발사 (방식 A: 즉시 은신)
  const checkAndExecute = (nowMs) => {
    const targetDate = new Date(serverTime);
    targetDate.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
    
    let executeTime = targetDate.getTime();
    if (isCompEnabled) {
      executeTime -= (parseFloat(compValue) * 1000);
    }

    if (nowMs >= executeTime) {
      // [발사] 네이티브 클릭 실행 (좌표값은 SharedData에 이미 저장됨)
      // performClick 함수 내부에서 자동으로 OverlayService를 stop 시킴 (은신)
      ClickerCoreModule.performClick(0, 0); 
      
      setIsRunning(false);
      setActiveMode(null);
      Alert.alert("발사 성공", "목표 시간에 클릭을 실행하고 오버레이를 해제했습니다.");
    }
  };

  // 4. 오버레이 제어 (네이티브 서비스 호출)
  const toggleOverlay = (mode) => {
    if (activeMode === mode) {
      ClickerCoreModule.showOverlay("HIDE");
      setActiveMode(null);
    } else {
      ClickerCoreModule.showOverlay(mode); // 'LOCATION' 또는 'ID'
      setActiveMode(mode);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <Text style={styles.headerTitle}>🎯 PRO 서버시간 클릭커</Text>

      {/* --- 서버 시간 카드 --- */}
      <View style={styles.card}>
        <View style={styles.urlRow}>
          <TextInput 
            style={styles.urlInput} 
            value={targetUrl} 
            onChangeText={setTargetUrl}
            placeholder="대상 URL (예: interpark.com)"
          />
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      {/* --- 실행 모드 선택 (방식 1, 2) --- */}
      <View style={styles.modeRow}>
        <TouchableOpacity 
          style={[styles.modeBtn, activeMode === 'LOCATION' && styles.modeBtnActive]} 
          onPress={() => toggleOverlay('LOCATION')}
        >
          <Crosshair size={24} color={activeMode === 'LOCATION' ? '#FFF' : '#007AFF'} />
          <Text style={[styles.modeBtnText, activeMode === 'LOCATION' && styles.modeTextColor]}>위치 지정</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeBtn, activeMode === 'ID' && styles.modeBtnActive]} 
          onPress={() => toggleOverlay('ID')}
        >
          <MousePointerClick size={24} color={activeMode === 'ID' ? '#FFF' : '#007AFF'} />
          <Text style={[styles.modeBtnText, activeMode === 'ID' && styles.modeTextColor]}>객체 지정</Text>
        </TouchableOpacity>
      </View>

      {/* --- 보정 설정 --- */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Zap size={18} color="#FF9500" />
            <Text style={styles.sectionTitle}> 선입력 보정 (Latency)</Text>
          </View>
          <Switch value={isCompEnabled} onValueChange={setIsCompEnabled} />
        </View>
        {isCompEnabled && (
          <View style={styles.compInputRow}>
            <TextInput 
              style={styles.compInput} 
              value={compValue} 
              onChangeText={setCompValue} 
              keyboardType="numeric"
            />
            <Text style={styles.compUnit}>초 먼저 클릭 실행</Text>
          </View>
        )}
      </View>

      {/* --- 목표 시간 설정 --- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>목표 시간 설정</Text>
        <View style={styles.targetInputRow}>
          {[{v:targetH, s:setTargetH}, {v:targetM, s:setTargetM}, {v:targetS, s:setTargetS}].map((t, i) => (
            <React.Fragment key={i}>
              <TextInput style={styles.timeInput} value={t.v} onChangeText={t.s} keyboardType="numeric" maxLength={2} />
              {i < 2 && <Text style={styles.colon}>:</Text>}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* --- 메인 실행 버튼 --- */}
      <TouchableOpacity 
        style={[styles.mainStartBtn, isRunning && styles.mainStopBtn]} 
        onPress={() => {
          if (!activeMode) {
            Alert.alert("알림", "먼저 위치나 객체를 지정해주세요.");
            return;
          }
          setIsRunning(!isRunning);
        }}
      >
        {isRunning ? <Square color="#FFF" fill="#FFF" /> : <Play color="#FFF" fill="#FFF" />}
        <Text style={styles.mainStartBtnText}>{isRunning ? ' 대기 취소' : ' 클릭 대기 시작 (발사)'}</Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>* 실행 즉시 모든 오버레이가 자동으로 숨겨집니다.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 50, marginBottom: 20, textAlign: 'center', color: '#1C1C1E' },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  urlRow: { flexDirection: 'row', marginBottom: 15 },
  urlInput: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  syncBtn: { backgroundColor: '#007AFF', width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  timeText: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  msText: { fontSize: 22, color: '#007AFF' },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modeBtn: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  modeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  modeBtnText: { marginTop: 10, fontWeight: 'bold', color: '#007AFF' },
  modeTextColor: { color: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#3A3A3C' },
  compInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  compInput: { backgroundColor: '#F2F2F7', width: 80, height: 40, borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
  compUnit: { marginLeft: 10, color: '#8E8E93' },
  targetInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  timeInput: { backgroundColor: '#F2F2F7', width: 70, height: 60, borderRadius: 12, textAlign: 'center', fontSize: 32, fontWeight: 'bold', color: '#1C1C1E' },
  colon: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 10 },
  mainStartBtn: { backgroundColor: '#34C759', padding: 20, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  mainStopBtn: { backgroundColor: '#FF3B30' },
  mainStartBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  infoText: { textAlign: 'center', color: '#8E8E93', marginTop: 15, fontSize: 12 }
});
