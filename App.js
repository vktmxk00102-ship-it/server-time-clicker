import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  NativeModules, Switch, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings, ChevronUp, ChevronDown } from 'lucide-react-native';

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

  const syncServerTime = async () => {
    let finalUrl = selectedSite === 'CUSTOM' ? targetUrl : selectedSite;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
    try {
      const offset = await ClickerCoreModule.getServerTimeOffset(finalUrl);
      setTimeOffset(parseFloat(offset));
      Alert.alert("완료", `오차 보정: ${parseFloat(offset).toFixed(0)}ms`);
    } catch (e) { Alert.alert("에러", "동기화 실패"); }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      setServerTime(new Date(nowMs));
      if (isRunning) {
        const targetDate = new Date(nowMs);
        targetDate.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
        let executeTime = targetDate.getTime();
        if (executeTime < nowMs - 5000) executeTime += 86400000;
        if (isCompEnabled) executeTime -= (parseFloat(compValue) * 1000);
        if (nowMs >= executeTime) {
          ClickerCoreModule.performClick(0, 0); // Native SharedData 사용
          setIsRunning(false);
          setActiveMode(null);
          Alert.alert("성공", "클릭 실행 완료");
        }
      }
    }, 10);
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  const adjustTime = (type, amount) => {
    let h = parseInt(targetH), m = parseInt(targetM), s = parseInt(targetS);
    const val = isPlusMode ? amount : -amount;
    if (type === 'H') h += val; if (type === 'M') m += val; if (type === 'S') s += val;
    const d = new Date(); d.setHours(h, m, s, 0);
    setTargetH(String(d.getHours()).padStart(2,'0'));
    setTargetM(String(d.getMinutes()).padStart(2,'0'));
    setTargetS(String(d.getSeconds()).padStart(2,'0'));
  };

  const setNearestTime = (type) => {
    const now = new Date(Date.now() + timeOffset);
    let h = now.getHours(), m = now.getMinutes();
    if (type === '30') {
      if (m < 30) { m = 30; } 
      else { m = 30; h += 1; } // 30분 이후 누르면 다음 시간 30분으로 보정
    } else { m = 0; h += 1; }
    const next = new Date(now); next.setHours(h, m, 0, 0);
    setTargetH(String(next.getHours()).padStart(2,'0'));
    setTargetM(String(next.getMinutes()).padStart(2,'0'));
    setTargetS('00');
  };

  const toggleOverlay = async (mode) => {
    const hasPerm = await ClickerCoreModule.checkOverlayPermission();
    if (!hasPerm) {
      return Alert.alert("권한 필요", "설정에서 허용해주세요.", 
      [{text: "이동", onPress: () => ClickerCoreModule.openSettings()}]);
    }
    if (activeMode === mode) { setActiveMode(null); } 
    else { const res = await ClickerCoreModule.showOverlay(mode); if(res) setActiveMode(mode); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🎯 PRO 티켓팅 (Android 16)</Text>
      <View style={styles.compactCard}>
        <View style={styles.row}>
          <Picker selectedValue={selectedSite} onValueChange={v => setSelectedSite(v)} style={{width:150, height:40}}>
            {SITE_PRESETS.map((s,i) => <Picker.Item key={i} label={s.label} value={s.value}/>)}
          </Picker>
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={16} color="#FFF"/><Text style={styles.syncText}> 동기화</Text>
          </TouchableOpacity>
        </View>
        {selectedSite === 'CUSTOM' && <TextInput style={styles.urlInput} value={targetUrl} onChangeText={setTargetUrl} placeholder="URL 입력"/>}
        <Text style={styles.serverTimeText}>{serverTime.toLocaleTimeString('ko-KR',{hour12:false})}<Text style={styles.msText}>.{String(serverTime.getMilliseconds()).padStart(3,'0')}</Text></Text>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>목표 시간</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.quickBtn} onPress={()=>setNearestTime('30')}><Text style={styles.quickText}>다음 30분</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={()=>setNearestTime('00')}><Text style={styles.quickText}>다음 정각</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.timeControlContainer}>
          <TouchableOpacity style={[styles.modeToggleBtn, {backgroundColor: isPlusMode?'#FF3B30':'#007AFF'}]} onPress={()=>setIsPlusMode(!isPlusMode)}>
            {isPlusMode?<ChevronUp color="#FFF"/>:<ChevronDown color="#FFF"/>}
            <Text style={styles.modeToggleText}>{isPlusMode?'증가':'감소'}</Text>
          </TouchableOpacity>
          <View style={styles.timeInputsArea}>
            {['H','M','S'].map((t,idx)=>(
              <React.Fragment key={t}>
                <View style={styles.col}>
                  <TextInput style={styles.tInput} value={t==='H'?targetH:t==='M'?targetM:targetS} keyboardType="numeric"/>
                  <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.numBtn} onPress={()=>adjustTime(t,10)}><Text style={styles.numTxt}>10</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.numBtn} onPress={()=>adjustTime(t,1)}><Text style={styles.numTxt}>1</Text></TouchableOpacity>
                  </View>
                </View>
                {idx < 2 && <Text style={styles.colon}>:</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.rowCard}>
        <View style={styles.row}><Zap size={16} color="#FF9500"/><Text style={styles.subTitle}> 선입력 보정</Text></View>
        <TextInput style={styles.miniInput} value={compValue} onChangeText={setCompValue} keyboardType="numeric"/>
        <Switch value={isCompEnabled} onValueChange={setIsCompEnabled}/>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actBtn, activeMode==='LOCATION'&&styles.actOn]} onPress={()=>toggleOverlay('LOCATION')}>
          <Crosshair size={20} color={activeMode==='LOCATION'?'#FFF':'#555'}/><Text style={[styles.actTxt, activeMode==='LOCATION'&&styles.actTxtOn]}>위치 지정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actBtn, activeMode==='ID'&&styles.actOn]} onPress={()=>toggleOverlay('ID')}>
          <MousePointerClick size={20} color={activeMode==='ID'?'#FFF':'#555'}/><Text style={[styles.actTxt, activeMode==='ID'&&styles.actTxtOn]}>객체 지정</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.startBtn, isRunning && styles.stopBtn]} onPress={()=>setIsRunning(!isRunning)}>
        {isRunning?<Square fill="#FFF" color="#FFF"/>:<Play fill="#FFF" color="#FFF"/>}
        <Text style={styles.startBtnText}>{isRunning?'대기 취소':'클릭 대기 시작'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5', padding: 15, paddingTop: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  compactCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  urlInput: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, marginTop: 10 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
  rowCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncBtn: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', marginLeft: 10 },
  syncText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  serverTimeText: { fontSize: 36, fontWeight: 'bold', color: '#111', marginTop: 10 },
  msText: { fontSize: 20, color: '#007AFF' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  quickBtn: { backgroundColor: '#EEE', padding: 6, borderRadius: 6, marginLeft: 5 },
  quickText: { fontSize: 11, color: '#333' },
  timeControlContainer: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  modeToggleBtn: { width: 50, height: 90, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginRight: 10 },
  modeToggleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  timeInputsArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  col: { alignItems: 'center', width: 65 },
  tInput: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F5F5F5', width: '100%', height: 50, borderRadius: 8 },
  btnGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 5 },
  numBtn: { backgroundColor: '#E0E0E0', width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  numTxt: { fontSize: 11, fontWeight: 'bold' },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 2, marginBottom: 35 },
  subTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  miniInput: { backgroundColor: '#F5F5F5', width: 60, height: 35, borderRadius: 5, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  actBtn: { flex: 1, backgroundColor: '#FFF', padding: 12, alignItems: 'center', borderRadius: 10, marginHorizontal: 2, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'center' },
  actOn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  actTxt: { marginLeft: 5, fontWeight: 'bold', color: '#555' },
  actTxtOn: { color: '#FFF' },
  startBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  stopBtn: { backgroundColor: '#FF3B30' },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});
