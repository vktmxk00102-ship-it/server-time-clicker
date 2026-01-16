import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  NativeModules, Switch, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings, ChevronUp, ChevronDown } from 'lucide-react-native';

const { ClickerCoreModule } = NativeModules;

// 주요 사이트 목록
const SITE_PRESETS = [
  { label: '네이버 시계', value: 'https://time.navyism.com/?host=naver.com' },
  { label: '인터파크', value: 'https://ticket.interpark.com' },
  { label: '구글', value: 'https://www.google.com' },
];

export default function App() {
  // --- 상태 관리 ---
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  
  const [targetUrl, setTargetUrl] = useState(SITE_PRESETS[0].value);
  const [selectedSite, setSelectedSite] = useState(SITE_PRESETS[0].value);

  // 목표 시간 (문자열로 관리)
  const [targetH, setTargetH] = useState('20');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');

  // 조작 모드 (+/-)
  const [isPlusMode, setIsPlusMode] = useState(true);

  // 보정 및 실행
  const [isCompEnabled, setIsCompEnabled] = useState(true);
  const [compValue, setCompValue] = useState('0.05');
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null);

  // 1. 서버 시간 동기화 (Android 16 대응: String 반환 처리)
  const syncServerTime = async () => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    try {
      // 네이티브 모듈에서 String으로 결과를 받음
      const result = await ClickerCoreModule.getServerTimeOffset(finalUrl);
      
      if (typeof result === 'string' && result.startsWith("ERROR")) {
         Alert.alert("실패", "서버 응답 오류: " + result);
      } else {
         // 성공 시 숫자로 변환
         const offset = parseFloat(result);
         if (isNaN(offset)) {
            Alert.alert("오류", "시간 값을 해석할 수 없습니다.");
         } else {
            setTimeOffset(offset);
            Alert.alert("완료", `오차 보정: ${offset.toFixed(0)}ms`);
         }
      }
    } catch (e) {
      Alert.alert("오류", `네이티브 에러: ${e.message}`);
    }
  };

  // 2. 타이머 & 실행 루프
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      const now = new Date(nowMs);
      setServerTime(now);

      if (isRunning) {
        const targetDate = new Date(now);
        targetDate.setHours(parseInt(targetH || '0'), parseInt(targetM || '0'), parseInt(targetS || '0'), 0);
        
        let executeTime = targetDate.getTime();
        // 목표 시간이 현재보다 과거라면 내일로 계산
        if (executeTime < nowMs - 10000) { // 10초 이상 지났으면 내일로 간주
             executeTime += 24 * 60 * 60 * 1000;
        }

        if (isCompEnabled) executeTime -= (parseFloat(compValue || '0') * 1000);

        // 실행 시간 도달 체크
        if (nowMs >= executeTime) {
          // 좌표는 0,0을 보내지만 네이티브(SharedData)에 저장된 값을 쓰도록 유도
          ClickerCoreModule.performClick(0, 0);
          setIsRunning(false);
          setActiveMode(null);
          Alert.alert("성공", "🎯 클릭이 실행되었습니다!");
        }
      }
    }, 10); // 10ms 정밀도
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 3. 시간 계산 로직 (UI 기존 유지)
  const adjustTime = (type, amount) => {
    let h = parseInt(targetH || '0');
    let m = parseInt(targetM || '0');
    let s = parseInt(targetS || '0');
    
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
    let h = now.getHours();
    let m = now.getMinutes();

    if (type === '30') {
      if (m < 30) m = 30;
      else { m = 0; h += 1; }
    } else {
      m = 0; h += 1;
    }
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    setTargetH(next.getHours().toString().padStart(2, '0'));
    setTargetM(next.getMinutes().toString().padStart(2, '0'));
    setTargetS('00');
  };

  // 4. 오버레이 토글 (Android 16 대응: String 반환값 체크)
  const toggleOverlay = async (mode) => {
    try {
      if (activeMode === mode) {
        // 닫기 시도
        // 네이티브에 닫기 기능이 없다면 showOverlay("HIDE") 등 구현 필요하나
        // 보통 StopService로 처리됨. 여기선 UI 상태만 변경.
        setActiveMode(null);
        Alert.alert("알림", "오버레이를 닫으려면 네이티브에서 '종료' 버튼을 눌러주세요.");
      } else {
        // 권한 체크 먼저
        const hasPerm = await ClickerCoreModule.checkOverlayPermission();
        if (!hasPerm) {
             Alert.alert("권한 필요", "설정에서 '다른 앱 위에 표시' 권한을 켜주세요.", [
                { text: "설정 열기", onPress: async () => {
                     const res = await ClickerCoreModule.openSettings();
                     if (res !== "OK") Alert.alert("설정 열기 실패", res);
                }}
             ]);
             return;
        }

        // 오버레이 실행
        const result = await ClickerCoreModule.showOverlay(mode);
        if (result === "OK") {
            setActiveMode(mode);
        } else {
            Alert.alert("실행 실패", "오류 메시지: " + result);
        }
      }
    } catch (e) {
      Alert.alert("오류", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🎯 PRO 티켓팅 (Android 16)</Text>

      {/* 1. 서버 시간 & URL */}
      <View style={styles.compactCard}>
        <View style={styles.row}>
          <Picker
            selectedValue={selectedSite}
            onValueChange={(v) => { setSelectedSite(v); if(v) setTargetUrl(v); }}
            style={{ width: 130, height: 40 }}
            mode="dropdown"
          >
            {SITE_PRESETS.map((s, i) => <Picker.Item key={i} label={s.label} value={s.value} />)}
          </Picker>
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={16} color="#FFF" />
            <Text style={styles.syncText}> 동기화</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.serverTimeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      {/* 2. 목표 시간 설정 */}
      <View style={[styles.card, { flex: 0 }]}>
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

      {/* 3. 보정 및 실행 */}
      <View style={styles.rowCard}>
        <View style={styles.row}>
          <Zap size={16} color="#FF9500" />
          <Text style={styles.subTitle}> 선입력 보정 (초)</Text>
        </View>
        <TextInput 
           style={styles.miniInput} 
           value={compValue} 
           onChangeText={setCompValue} 
           keyboardType="numeric" 
           placeholder="0.05"
        />
        <Switch value={isCompEnabled} onValueChange={setIsCompEnabled} />
      </View>

      {/* 4. 모드 선택 및 실행 */}
      <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actBtn, activeMode==='LOCATION' && styles.actOn]} onPress={() => toggleOverlay('LOCATION')}>
             <Crosshair size={20} color={activeMode==='LOCATION'?'#FFF':'#555'} />
             <Text style={[styles.actTxt, activeMode==='LOCATION' && styles.actTxtOn]}>위치 지정</Text>
          </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.startBtn, isRunning && styles.stopBtn]} 
        onPress={() => {
            if(!activeMode && !isRunning) {
                // 경고: 위치 지정 여부 확인 (Native의 SharedData 확인 불가하므로 사용자에게 맡김)
                Alert.alert("확인", "십자선으로 위치를 지정하셨나요?", [
                    { text: "아니요", style: "cancel" },
                    { text: "네", onPress: () => setIsRunning(true) }
                ]);
            } else {
                setIsRunning(!isRunning);
            }
        }}
      >
        {isRunning ? <Square fill="#FFF" color="#FFF"/> : <Play fill="#FFF" color="#FFF"/>}
        <Text style={styles.startBtnText}>{isRunning ? '대기 취소' : '클릭 대기 시작 (READY)'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.permLink} onPress={async () => {
          const res = await ClickerCoreModule.openSettings();
          if(res !== "OK") Alert.alert("설정 에러", res);
      }}>
         <Settings size={14} color="#999" />
         <Text style={{color:'#999', fontSize:12}}> 오버레이 권한 설정 (안될 때 클릭)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5', padding: 15, paddingTop: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  compactCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
  rowCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  syncBtn: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', marginLeft: 10 },
  syncText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  serverTimeText: { fontSize: 36, fontWeight: 'bold', color: '#111', marginTop: 5, fontVariant: ['tabular-nums'] },
  msText: { fontSize: 20, color: '#007AFF' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  quickBtn: { backgroundColor: '#EEE', padding: 6, borderRadius: 6, marginLeft: 5 },
  quickText: { fontSize: 11, color: '#333' },
  timeControlContainer: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  modeToggleBtn: { width: 50, height: 90, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginRight: 10 },
  modeToggleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  timeInputsArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  col: { alignItems: 'center', width: 65 },
  tInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F5F5F5', width: '100%', height: 50, borderRadius: 8, marginBottom: 5 },
  btnGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  numBtn: { backgroundColor: '#E0E0E0', width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  numTxt: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 2, marginBottom: 35 },
  subTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  miniInput: { backgroundColor: '#F5F5F5', width: 60, height: 35, borderRadius: 5, textAlign: 'center', fontSize: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  actBtn: { flex: 1, backgroundColor: '#FFF', padding: 12, alignItems: 'center', borderRadius: 10, marginHorizontal: 2, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'center' },
  actOn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  actTxt: { marginLeft: 5, fontWeight: 'bold', color: '#555' },
  actTxtOn: { color: '#FFF' },
  startBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  stopBtn: { backgroundColor: '#FF3B30' },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  permLink: { alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center' },
});
