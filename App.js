import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  NativeModules, Switch, Platform, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings, ChevronUp, ChevronDown } from 'lucide-react-native';

const { ClickerCoreModule } = NativeModules;
const SCREEN_HEIGHT = Dimensions.get('window').height;

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

  // 1. 서버 시간 동기화
  const syncServerTime = async () => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    try {
      const offset = await ClickerCoreModule.getServerTimeOffset(finalUrl);
      if (offset === 0 && !finalUrl.includes('google')) {
         Alert.alert("실패", "서버 응답이 없습니다.");
      } else {
         setTimeOffset(offset);
         Alert.alert("완료", `오차 보정: ${offset.toFixed(0)}ms`);
      }
    } catch (e) {
      Alert.alert("오류", "인터넷 연결을 확인하세요.");
    }
  };

  // 2. 타이머 & 실행
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
          ClickerCoreModule.performClick(0, 0);
          setIsRunning(false);
          setActiveMode(null);
          Alert.alert("실행 완료", "클릭 후 종료되었습니다.");
        }
      }
    }, 10);
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 3. 시간 계산 로직
  const adjustTime = (type, amount) => {
    let h = parseInt(targetH || '0');
    let m = parseInt(targetM || '0');
    let s = parseInt(targetS || '0');
    
    // +/- 모드 적용
    const val = isPlusMode ? amount : -amount;

    if (type === 'H') h += val;
    if (type === 'M') m += val;
    if (type === 'S') s += val;

    // 시간 정규화 (60초 -> 1분, 60분 -> 1시간 등)
    const date = new Date();
    date.setHours(h, m, s, 0);
    
    setTargetH(date.getHours().toString().padStart(2, '0'));
    setTargetM(date.getMinutes().toString().padStart(2, '0'));
    setTargetS(date.getSeconds().toString().padStart(2, '0'));
  };

  // 가까운 30분/정각 설정
  const setNearestTime = (type) => {
    const now = new Date(Date.now() + timeOffset);
    let h = now.getHours();
    let m = now.getMinutes();

    if (type === '30') {
      if (m < 30) m = 30;
      else { m = 0; h += 1; }
    } else {
      // 정각
      m = 0; h += 1;
    }

    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    
    setTargetH(next.getHours().toString().padStart(2, '0'));
    setTargetM(next.getMinutes().toString().padStart(2, '0'));
    setTargetS('00');
  };

  // 오버레이 토글 (권한 체크)
  const toggleOverlay = async (mode) => {
    try {
      if (activeMode === mode) {
        ClickerCoreModule.showOverlay("HIDE");
        setActiveMode(null);
      } else {
        await ClickerCoreModule.showOverlay(mode);
        setActiveMode(mode);
      }
    } catch (e) {
      Alert.alert("권한 필요", "설정에서 '다른 앱 위에 표시' 권한을 켜주세요.", [
        { text: "설정 열기", onPress: () => ClickerCoreModule.openSettings() }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🎯 PRO 티켓팅 (서버동기화)</Text>

      {/* 1. 서버 시간 & URL (컴팩트) */}
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
        
        {/* 서버 시간 (크게) */}
        <Text style={styles.serverTimeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      {/* 2. 목표 시간 설정 (요청하신 +/- 및 10/1 버튼 UI) */}
      <View style={[styles.card, { flex: 0 }]}>
        <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>목표 시간</Text>
            {/* 단축 버튼 */}
            <View style={styles.row}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setNearestTime('30')}><Text style={styles.quickText}>다음 30분</Text></TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setNearestTime('00')}><Text style={styles.quickText}>다음 정각</Text></TouchableOpacity>
            </View>
        </View>

        <View style={styles.timeControlContainer}>
          {/* 왼쪽: +/- 모드 변경 버튼 */}
          <TouchableOpacity 
            style={[styles.modeToggleBtn, { backgroundColor: isPlusMode ? '#FF3B30' : '#007AFF' }]}
            onPress={() => setIsPlusMode(!isPlusMode)}
          >
            {isPlusMode ? <ChevronUp color="#FFF" /> : <ChevronDown color="#FFF" />}
            <Text style={styles.modeToggleText}>{isPlusMode ? '증가' : '감소'}</Text>
          </TouchableOpacity>

          {/* 시/분/초 컨트롤 */}
          <View style={styles.timeInputsArea}>
             {/* 시 */}
             <View style={styles.col}>
                <TextInput style={styles.tInput} value={targetH} onChangeText={setTargetH} keyboardType="numeric" />
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('H', 10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('H', 1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                </View>
             </View>
             <Text style={styles.colon}>:</Text>
             {/* 분 */}
             <View style={styles.col}>
                <TextInput style={styles.tInput} value={targetM} onChangeText={setTargetM} keyboardType="numeric" />
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('M', 10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={() => adjustTime('M', 1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                </View>
             </View>
             <Text style={styles.colon}>:</Text>
             {/* 초 */}
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
          
          <TouchableOpacity style={[styles.actBtn, activeMode==='ID' && styles.actOn]} onPress={() => toggleOverlay('ID')}>
             <MousePointerClick size={20} color={activeMode==='ID'?'#FFF':'#555'} />
             <Text style={[styles.actTxt, activeMode==='ID' && styles.actTxtOn]}>객체 지정</Text>
          </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.startBtn, isRunning && styles.stopBtn]} 
        onPress={() => {
            if(!activeMode && !isRunning) return Alert.alert("알림", "위치나 객체를 먼저 지정하세요.");
            setIsRunning(!isRunning);
        }}
      >
        {isRunning ? <Square fill="#FFF" color="#FFF"/> : <Play fill="#FFF" color="#FFF"/>}
        <Text style={styles.startBtnText}>{isRunning ? '대기 취소' : '클릭 대기 시작 (READY)'}</Text>
      </TouchableOpacity>
      
      {/* 권한 설정 바로가기 */}
      <TouchableOpacity style={styles.permLink} onPress={() => ClickerCoreModule.openSettings()}>
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
  
  // 시간 조절 UI 스타일
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
