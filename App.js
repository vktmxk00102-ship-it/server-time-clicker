import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  NativeModules, Switch, Dimensions, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // npm install @react-native-picker/picker 필수
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings, ChevronUp, ChevronDown } from 'lucide-react-native';

const { ClickerCoreModule } = NativeModules;

// 주요 사이트 목록 (직접 입력 포함)
const SITE_PRESETS = [
  { label: '직접 입력', value: 'DIRECT' },
  { label: '네이버 시계', value: 'https://time.navyism.com/?host=naver.com' },
  { label: '인터파크 티켓', value: 'https://ticket.interpark.com' },
  { label: '예스24 티켓', value: 'http://ticket.yes24.com' },
  { label: '구글', value: 'https://www.google.com' },
];

export default function App() {
  // --- 상태 관리: 시간 및 서버 ---
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  const [targetUrl, setTargetUrl] = useState('https://time.navyism.com/?host=naver.com');
  const [selectedPreset, setSelectedPreset] = useState(SITE_PRESETS[1].value);

  // --- 상태 관리: 목표 시간 ---
  const [targetH, setTargetH] = useState('20');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');
  const [isPlusMode, setIsPlusMode] = useState(true); // +/- 토글 상태

  // --- 상태 관리: 실행 및 모드 ---
  const [isCompEnabled, setIsCompEnabled] = useState(true);
  const [compValue, setCompValue] = useState('0.05');
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null);

  // [핵심] 1. 앱 시작 시 권한 자동 확인
  useEffect(() => {
    const checkPermissionOnLaunch = async () => {
      try {
        const hasPermission = await ClickerCoreModule.checkOverlayPermission();
        if (!hasPermission) {
          Alert.alert(
            "권한 설정 필요",
            "오버레이 기능을 사용하려면 '다른 앱 위에 표시' 권한이 필요합니다. 설정 화면으로 이동하시겠습니까?",
            [
              { text: "나중에" },
              { text: "설정하러 가기", onPress: () => ClickerCoreModule.openSettings() }
            ]
          );
        }
      } catch (e) {
        console.log("Permission check failed", e);
      }
    };
    checkPermissionOnLaunch();
  }, []);

  // 2. 서버 시간 동기화
  const syncServerTime = async () => {
    try {
      const offset = await ClickerCoreModule.getServerTimeOffset(targetUrl);
      setTimeOffset(offset);
      Alert.alert("동기화 완료", `서버 시간과의 오차: ${offset.toFixed(1)}ms 보정됨`);
    } catch (e) {
      Alert.alert("오류", "동기화에 실패했습니다. 인터넷이나 URL을 확인하세요.");
    }
  };

  // 3. 실시간 타이머 및 실행 감시 (방식 A: 즉시 은신)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      setServerTime(new Date(nowMs));

      if (isRunning) {
        const target = new Date(nowMs);
        target.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
        let execTime = target.getTime();
        if (isCompEnabled) execTime -= (parseFloat(compValue) * 1000);

        if (nowMs >= execTime) {
          ClickerCoreModule.performClick(0, 0); // 실행 (네이티브에서 서비스 종료 처리됨)
          setIsRunning(false);
          setActiveMode(null);
        }
      }
    }, 10);
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 4. 시간 조절 함수 (+/- 반영 및 단위 조정)
  const adjust = (type, amount) => {
    const change = isPlusMode ? amount : -amount;
    const d = new Date();
    d.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS));

    if (type === 'H') d.setHours(d.getHours() + change);
    if (type === 'M') d.setMinutes(d.getMinutes() + change);
    if (type === 'S') d.setSeconds(d.getSeconds() + change);

    setTargetH(d.getHours().toString().padStart(2, '0'));
    setTargetM(d.getMinutes().toString().padStart(2, '0'));
    setTargetS(d.getSeconds().toString().padStart(2, '0'));
  };

  // 5. 단축 버튼 (정각, 30분)
  const setQuickTime = (type) => {
    const d = new Date(Date.now() + timeOffset);
    if (type === '00') { d.setHours(d.getHours() + 1); d.setMinutes(0); }
    else { if (d.getMinutes() >= 30) { d.setHours(d.getHours() + 1); d.setMinutes(0); } else d.setMinutes(30); }
    setTargetH(d.getHours().toString().padStart(2, '0'));
    setTargetM(d.getMinutes().toString().padStart(2, '0'));
    setTargetS('00');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      <Text style={styles.title}>🎯 PRO 서버시간 클릭커</Text>

      {/* --- 동기화 카드 --- */}
      <View style={styles.card}>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={selectedPreset}
            onValueChange={(v) => { setSelectedPreset(v); if(v !== 'DIRECT') setTargetUrl(v); }}
            style={styles.picker}
          >
            {SITE_PRESETS.map((s, i) => <Picker.Item key={i} label={s.label} value={s.value} />)}
          </Picker>
        </View>
        <View style={styles.urlRow}>
          <TextInput 
            style={styles.urlInput} 
            value={targetUrl} 
            onChangeText={setTargetUrl} 
            placeholder="URL 직접 입력 (https://...)" 
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.serverTimeText} adjustsFontSizeToFit numberOfLines={1}>
            {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
            <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
          </Text>
        </View>
      </View>

      {/* --- 목표 시간 설정 카드 --- */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>목표 시간 설정</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.qBtn} onPress={() => setQuickTime('30')}><Text style={styles.qText}>30분</Text></TouchableOpacity>
            <TouchableOpacity style={styles.qBtn} onPress={() => setQuickTime('00')}><Text style={styles.qText}>정각</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeControlRow}>
          {/* 왼쪽 끝: +/- 토글 버튼 */}
          <TouchableOpacity 
            style={[styles.pmToggle, { backgroundColor: isPlusMode ? '#FF3B30' : '#007AFF' }]} 
            onPress={() => setIsPlusMode(!isPlusMode)}
          >
            {isPlusMode ? <ChevronUp color="#FFF" /> : <ChevronDown color="#FFF" />}
            <Text style={styles.pmText}>{isPlusMode ? '증가' : '감소'}</Text>
          </TouchableOpacity>

          {/* 시, 분, 초 단위 조절 */}
          <View style={styles.inputsContainer}>
            {['H', 'M', 'S'].map((type, idx) => (
              <React.Fragment key={type}>
                <View style={styles.timeColumn}>
                  <TextInput 
                    style={styles.tInput} 
                    value={type==='H'?targetH:type==='M'?targetM:targetS} 
                    keyboardType="numeric" 
                    maxLength={2}
                    onChangeText={(v) => type==='H'?setTargetH(v):type==='M'?setTargetM(v):setTargetS(v)}
                  />
                  <View style={styles.adjustBtns}>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => adjust(type, 10)}><Text style={styles.smallBtnTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => adjust(type, 1)}><Text style={styles.smallBtnTxt}>1</Text></TouchableOpacity>
                  </View>
                </View>
                {idx < 2 && <Text style={styles.colon}>:</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      {/* --- 보정 설정 --- */}
      <View style={styles.rowCard}>
        <View style={styles.row}>
          <Zap size={18} color="#FF9500" />
          <Text style={styles.bold}> 선입력(초) </Text>
        </View>
        <View style={styles.row}>
          <TextInput style={styles.compInput} value={compValue} onChangeText={setCompValue} keyboardType="numeric" />
          <Switch value={isCompEnabled} onValueChange={setIsCompEnabled} />
        </View>
      </View>

      {/* --- 오버레이 모드 선택 --- */}
      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeBtn, activeMode==='LOCATION' && styles.modeOn]} onPress={() => { ClickerCoreModule.showOverlay('LOCATION'); setActiveMode('LOCATION'); }}>
          <Crosshair size={20} color={activeMode==='LOCATION'?'#FFF':'#555'} />
          <Text style={[styles.modeTxt, activeMode==='LOCATION' && styles.modeTxtOn]}>위치 지정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, activeMode==='ID' && styles.modeOn]} onPress={() => { ClickerCoreModule.showOverlay('ID'); setActiveMode('ID'); }}>
          <MousePointerClick size={20} color={activeMode==='ID'?'#FFF':'#555'} />
          <Text style={[styles.modeTxt, activeMode==='ID' && styles.modeTxtOn]}>객체 지정</Text>
        </TouchableOpacity>
      </View>

      {/* --- 메인 실행 버튼 --- */}
      <TouchableOpacity 
        style={[styles.startBtn, isRunning && styles.stopBtn]} 
        onPress={() => {
          if(!activeMode && !isRunning) return Alert.alert("알림", "모드를 먼저 선택하세요.");
          setIsRunning(!isRunning);
        }}
      >
        <Text style={styles.startBtnText}>{isRunning ? '대기 취소 (STOP)' : '클릭 대기 시작 (START)'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsFooter} onPress={() => ClickerCoreModule.openSettings()}>
        <Settings size={14} color="#999" /><Text style={styles.settingsFooterTxt}> 시스템 권한 설정 바로가기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 12, elevation: 3 },
  rowCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerBox: { borderWidth: 1, borderColor: '#EEE', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  picker: { height: 50 },
  urlRow: { flexDirection: 'row', marginBottom: 15 },
  urlInput: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  syncBtn: { backgroundColor: '#007AFF', width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  timeBox: { alignItems: 'center', justifyContent: 'center' },
  serverTimeText: { fontSize: 42, fontWeight: 'bold', color: '#1C1C1E', textAlign: 'center' },
  msText: { fontSize: 24, color: '#007AFF' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  qBtn: { backgroundColor: '#E5E5EA', padding: 6, borderRadius: 8, marginLeft: 6 },
  qText: { fontSize: 11, fontWeight: 'bold' },
  
  // 시간 조절 레이아웃
  timeControlRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  pmToggle: { width: 55, height: 90, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  pmText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginTop: 5 },
  inputsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  timeColumn: { alignItems: 'center', width: 65 },
  tInput: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F2F2F7', width: '100%', height: 55, borderRadius: 10, marginBottom: 8 },
  adjustBtns: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  smallBtn: { backgroundColor: '#E5E5EA', width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  smallBtnTxt: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  colon: { fontSize: 26, fontWeight: 'bold', marginHorizontal: 5, marginBottom: 40 },
  
  bold: { fontWeight: 'bold' },
  compInput: { backgroundColor: '#F2F2F7', width: 80, height: 40, borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginRight: 10 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modeBtn: { flex: 1, backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginHorizontal: 4, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD' },
  modeOn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  modeTxt: { marginLeft: 10, fontWeight: 'bold', color: '#555' },
  modeTxtOn: { color: '#FFF' },
  startBtn: { backgroundColor: '#34C759', padding: 20, borderRadius: 18, alignItems: 'center' },
  stopBtn: { backgroundColor: '#FF3B30' },
  startBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  settingsFooter: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingBottom: 20 },
  settingsFooterTxt: { color: '#999', fontSize: 13 }
});
