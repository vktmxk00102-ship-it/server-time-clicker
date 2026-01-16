import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  NativeModules, Switch, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings, ChevronUp, ChevronDown } from 'lucide-react-native';

// 네이티브 모듈 연결 (사용자 명칭 준수)
const { ClickerCoreModule } = NativeModules;

const SITE_PRESETS = [
  { label: '네이버 시계', value: 'https://time.navyism.com/?host=naver.com' },
  { label: '인터파크', value: 'https://ticket.interpark.com' },
  { label: '구글', value: 'https://www.google.com' },
  { label: '직접 입력', value: 'CUSTOM' },
];

export default function App() {
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  const [targetUrl, setTargetUrl] = useState(SITE_PRESETS[0].value);
  const [selectedSite, setSelectedSite] = useState(SITE_PRESETS[0].value);

  const [targetH, setTargetH] = useState('20');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');

  const [isPlusMode, setIsPlusMode] = useState(true);
  const [isCompEnabled, setIsCompEnabled] = useState(true);
  const [compValue, setCompValue] = useState('0.05');
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null);

  // 1. 서버 시간 동기화 (네이티브 에러 방어 추가)
  const syncServerTime = async () => {
    let finalUrl = selectedSite === 'CUSTOM' ? targetUrl : selectedSite;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    try {
      const result = await ClickerCoreModule.getServerTimeOffset(finalUrl);
      if (typeof result === 'string' && result.startsWith("ERROR")) {
         Alert.alert("실패", result);
      } else {
         const offset = parseFloat(result);
         setTimeOffset(offset);
         Alert.alert("완료", `오차 보정: ${offset.toFixed(0)}ms`);
      }
    } catch (e) {
      Alert.alert("네이티브 연결 오류", "모듈 로드 실패: " + e.message);
    }
  };

  // 2. 타이머 & 실행 (원본 로직 유지)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      const now = new Date(nowMs);
      setServerTime(now);

      if (isRunning) {
        const targetDate = new Date(now);
        targetDate.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
        let executeTime = targetDate.getTime();
        
        if (isCompEnabled) executeTime -= (parseFloat(compValue) * 1000);

        if (nowMs >= executeTime) {
          ClickerCoreModule.performClick(0, 0); // 0,0 전달 시 네이티브 저장 좌표 사용
          setIsRunning(false);
          setActiveMode(null);
          Alert.alert("실행 완료", "클릭 후 종료되었습니다.");
        }
      }
    }, 10);
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 3. 시간 계산 로직 (원본 동일)
  const adjustTime = (type, amount) => {
    let h = parseInt(targetH || '0'), m = parseInt(targetM || '0'), s = parseInt(targetS || '0');
    const val = isPlusMode ? amount : -amount;
    if (type === 'H') h += val;
    if (type === 'M') m += val;
    if (type === 'S') s += val;

    const date = new Date();
    date.setHours(h, m, s, 0);
    setTargetH(date.getHours().toString().padStart(2, '0'));
    setTargetM(date.getMinutes().toString().padStart(2, '0'));
    setTargetS(date.getSeconds().toString().padStart(2, '0'));
  };

  const setNearestTime = (type) => {
    const now = new Date(Date.now() + timeOffset);
    let h = now.getHours(), m = now.getMinutes();
    if (type === '30') {
      if (m < 30) m = 30; else { m = 0; h += 1; }
    } else { m = 0; h += 1; }
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    setTargetH(next.getHours().toString().padStart(2, '0'));
    setTargetM(next.getMinutes().toString().padStart(2, '0'));
    setTargetS('00');
  };

  // 4. 오버레이 토글 (권한 체크 강화)
  const toggleOverlay = async (mode) => {
    try {
      const hasPerm = await ClickerCoreModule.checkOverlayPermission();
      if (!hasPerm) {
        Alert.alert("권한 필요", "다른 앱 위에 표시 권한을 허용해주세요.", [
          { text: "설정 열기", onPress: () => ClickerCoreModule.openSettings() }
        ]);
        return;
      }

      if (activeMode === mode) {
        setActiveMode(null);
      } else {
        const res = await ClickerCoreModule.showOverlay(mode);
        if (res === "OK") setActiveMode(mode);
        else Alert.alert("에러", res);
      }
    } catch (e) {
      Alert.alert("오류", e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🎯 PRO 티켓팅 (서버동기화)</Text>

      <View style={styles.compactCard}>
        <View style={styles.row}>
          <Picker
            selectedValue={selectedSite}
            onValueChange={(v) => setSelectedSite(v)}
            style={{ width: 140, height: 40 }}
          >
            {SITE_PRESETS.map((s, i) => <Picker.Item key={i} label={s.label} value={s.value} />)}
          </Picker>
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={16} color="#FFF" />
            <Text style={styles.syncText}> 동기화</Text>
          </TouchableOpacity>
        </View>

        {selectedSite === 'CUSTOM' && (
          <TextInput 
            style={styles.urlInput} 
            value={targetUrl} 
            onChangeText={setTargetUrl} 
            placeholder="URL 입력"
            autoCapitalize="none"
          />
        )}
        
        <Text style={styles.serverTimeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>목표 시간</Text>
            <View style={styles.row}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setNearestTime('30')}><Text style={styles.quickText}>다음 30분</Text></TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setNearestTime('00')}><Text style={styles.quickText}>다음 정각</Text></TouchableOpacity>
            </View>
        </View>

        <View style={styles.timeControlContainer}>
          <TouchableOpacity 
            style={[styles.modeToggleBtn, { backgroundColor: isPlusMode ? '#FF3B30' : '#007AFF' }]}
            onPress={() => setIsPlusMode(!isPlusMode)}
          >
            {isPlusMode ? <ChevronUp color="#FFF" /> : <ChevronDown color="#FFF" />}
            <Text style={styles.modeToggleText}>{isPlusMode ? '증가' : '감소'}</Text>
          </TouchableOpacity>

          <View style={styles.timeInputsArea}>
             <View style={styles.col}>
                <TextInput style={styles.tInput} value={targetH} onChangeText={setTargetH} keyboardType="numeric" />
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('H', 10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('H', 1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                </View>
             </View>
             <Text style={styles.colon}>:</Text>
             <View style={styles.col}>
                <TextInput style={styles.tInput} value={targetM} onChangeText={setTargetM} keyboardType="numeric" />
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('M', 10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('M', 1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                </View>
             </View>
             <Text style={styles.colon}>:</Text>
             <View style={styles.col}>
                <TextInput style={styles.tInput} value={targetS} onChangeText={setTargetS} keyboardType="numeric" />
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('S', 10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('S', 1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                </View>
             </View>
          </View>
        </View>
      </View>

      <View style={styles.rowCard}>
        <View style={styles.row}><Zap size={16} color="#FF9500" /><Text style={styles.subTitle}> 선입력 보정 (초)</Text></View>
        <TextInput style={styles.miniInput} value={compValue} onChangeText={setCompValue} keyboardType="numeric" />
        <Switch value={isCompEnabled} onValueChange={setIsCompEnabled} />
      </View>

      <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actBtn, activeMode==='LOCATION' && styles.actOn]} onPress={() => toggleOverlay('LOCATION')}>
             <Crosshair size={20} color={activeMode==='LOCATION'?'#FFF':'#555'} />
             <Text style={[styles.actTxt, activeMode==='LOCATION' && styles.actTxtOn]}>위치 지정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, activeMode==='ID' && styles.actOn]} onPress={() => toggleOverlay('ID')}>
             <MousePointerClick size={20} color={activeMode==='ID'?'#FFF':'#555'} />
             <Text style={[styles.actTxt, activeMode==='ID' && styles.actTxtOn]}>객체 지정</Text>
          </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.startBtn, isRunning && styles.stopBtn]} 
        onPress={() => setIsRunning(!isRunning)}
      >
        {isRunning ? <Square fill="#FFF" color="#FFF"/> : <Play fill="#FFF" color="#FFF"/>}
        <Text style={styles.startBtnText}>{isRunning ? '대기 취소' : '클릭 대기 시작 (READY)'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.permLink} onPress={() => ClickerCoreModule.openSettings()}>
         <Settings size={14} color="#999" />
         <Text style={{color:'#999', fontSize:12}}> 오버레이 권한 설정 (안될 때 클릭)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// 스타일 시트는 사용자 원본과 동일하게 유지 (지면 관계상 생략하거나 원본 그대로 사용하시면 됩니다)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5', padding: 15, paddingTop: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  compactCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  urlInput: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginTop: 10, backgroundColor: '#FAFAFA' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
  rowCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', marginLeft: 10 },
  syncText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  serverTimeText: { fontSize: 36, fontWeight: 'bold', color: '#111', marginTop: 10 },
  msText: { fontSize: 20, color: '#007AFF' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  quickBtn: { backgroundColor: '#EEE', padding: 6, borderRadius: 6, marginLeft: 5 },
  quickText: { fontSize: 11, color: '#333' },
  timeControlContainer: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  modeToggleBtn: { width: 55, height: 95, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginRight: 10 },
  modeToggleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  timeInputsArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  col: { alignItems: 'center', width: 70 },
  tInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F5F5F5', width: '100%', height: 55, borderRadius: 10, marginBottom: 8 },
  btnGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  numBtn: { backgroundColor: '#E0E0E0', width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  numTxt: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  colon: { fontSize: 26, fontWeight: 'bold', marginHorizontal: 4, marginBottom: 40 },
  subTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  miniInput: { backgroundColor: '#F5F5F5', width: 70, height: 40, borderRadius: 8, textAlign: 'center', fontSize: 18 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actBtn: { flex: 1, backgroundColor: '#FFF', padding: 15, alignItems: 'center', borderRadius: 12, marginHorizontal: 4, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'center' },
  actOn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  actTxt: { marginLeft: 8, fontWeight: 'bold', color: '#555' },
  actTxtOn: { color: '#FFF' },
  startBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  stopBtn: { backgroundColor: '#FF3B30' },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  permLink: { alignItems: 'center', marginTop: 20, flexDirection: 'row', justifyContent: 'center' },
});
