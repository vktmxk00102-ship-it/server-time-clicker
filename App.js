import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView,
  Dimensions, Animated, PanResponder, NativeModules, Switch, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // [설치 필요] npm install @react-native-picker/picker
import { Crosshair, MousePointerClick, Zap, Play, Square, RefreshCw, Settings as IconSettings } from 'lucide-react-native';

const { ClickerCoreModule } = NativeModules;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 주요 사이트 목록
const SITE_PRESETS = [
  { label: '직접 입력', value: '' },
  { label: '네이버 시계', value: 'https://time.navyism.com/?host=naver.com' },
  { label: '인터파크 티켓', value: 'https://ticket.interpark.com' },
  { label: '예스24 티켓', value: 'http://ticket.yes24.com' },
  { label: '멜론 티켓', value: 'https://ticket.melon.com' },
  { label: '구글', value: 'https://www.google.com' },
];

export default function App() {
  // 시간 상태
  const [timeOffset, setTimeOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  
  // URL 상태
  const [targetUrl, setTargetUrl] = useState('https://www.google.com');
  const [selectedSite, setSelectedSite] = useState(SITE_PRESETS[5].value);

  // 목표 시간
  const [targetH, setTargetH] = useState('20');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');

  // 보정 및 실행 상태
  const [isCompEnabled, setIsCompEnabled] = useState(true);
  const [compValue, setCompValue] = useState('0.05');
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState(null);

  // 1. 서버 시간 동기화 (https 자동 붙임 + 예외처리)
  const syncServerTime = async () => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith('http')) {
        finalUrl = 'https://' + finalUrl;
        setTargetUrl(finalUrl);
    }

    try {
      const offset = await ClickerCoreModule.getServerTimeOffset(finalUrl);
      if (offset === 0 && finalUrl.includes('google')) {
          // 구글 등 일부 사이트는 HEAD 요청을 막을 수 있음
          Alert.alert("알림", "해당 사이트는 서버 시간을 제공하지 않거나 차단되었습니다.");
      } else {
          setTimeOffset(offset);
          Alert.alert("동기화 성공", `지연 시간 보정됨: ${offset.toFixed(1)}ms`);
      }
    } catch (e) {
      Alert.alert("오류", "인터넷 연결을 확인하거나 URL을 확인해주세요.");
    }
  };

  // 2. 실시간 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now() + timeOffset;
      setServerTime(new Date(nowMs));
      if (isRunning) checkAndExecute(nowMs);
    }, 10); // 성능을 위해 10ms로 조정
    return () => clearInterval(timer);
  }, [isRunning, timeOffset, targetH, targetM, targetS, isCompEnabled, compValue]);

  // 3. 실행 로직 (은신)
  const checkAndExecute = (nowMs) => {
    const targetDate = new Date(serverTime);
    targetDate.setHours(parseInt(targetH), parseInt(targetM), parseInt(targetS), 0);
    
    let executeTime = targetDate.getTime();
    if (isCompEnabled) executeTime -= (parseFloat(compValue) * 1000);

    if (nowMs >= executeTime) {
      ClickerCoreModule.performClick(0, 0); 
      setIsRunning(false);
      setActiveMode(null);
      Alert.alert("실행 완료", "클릭 수행 후 오버레이가 종료되었습니다.");
    }
  };

  // 4. 오버레이 토글 (권한 체크 필수)
  const toggleOverlay = async (mode) => {
    try {
      if (activeMode === mode) {
        ClickerCoreModule.showOverlay("HIDE");
        setActiveMode(null);
      } else {
        // 네이티브 모듈 호출
        ClickerCoreModule.showOverlay(mode); 
        setActiveMode(mode);
      }
    } catch (e) {
      Alert.alert("권한 필요", "설정 > 다른 앱 위에 표시 권한을 허용해주세요.", [
        { text: "설정으로 이동", onPress: () => ClickerCoreModule.openSettings() },
        { text: "취소" }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <Text style={styles.headerTitle}>🎯 PRO 서버시간 클릭커</Text>

      {/* --- [수정] URL 콤보박스 & 입력창 --- */}
      <View style={styles.card}>
        <Text style={styles.label}>타겟 서버 선택</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSite}
            onValueChange={(itemValue) => {
              setSelectedSite(itemValue);
              if (itemValue !== '') setTargetUrl(itemValue);
            }}
            style={styles.picker}
            itemStyle={{height: 50}} // iOS용 높이
          >
            {SITE_PRESETS.map((site, idx) => (
               <Picker.Item key={idx} label={site.label} value={site.value} />
            ))}
          </Picker>
        </View>
        
        <View style={styles.urlRow}>
          <TextInput 
            style={styles.urlInput} 
            value={targetUrl} 
            onChangeText={(text) => { setTargetUrl(text); setSelectedSite(''); }}
            placeholder="URL 직접 입력"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.syncBtn} onPress={syncServerTime}>
            <RefreshCw size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* --- [수정] 시간 표시 (한 줄 유지) --- */}
        <View style={styles.timeContainer}>
            <Text 
                style={styles.timeText} 
                numberOfLines={1} 
                adjustsFontSizeToFit={true} // 글자가 길어지면 사이즈 자동 축소
            >
            {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
            <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
            </Text>
        </View>
      </View>

      {/* --- 실행 모드 --- */}
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
      
      {/* 권한 설정 바로가기 (오버레이가 죽을 때 대비) */}
      <TouchableOpacity style={styles.settingLink} onPress={() => ClickerCoreModule.openSettings()}>
        <IconSettings size={14} color="#888" />
        <Text style={styles.settingLinkText}> 오버레이 권한 설정 열기</Text>
      </TouchableOpacity>

      {/* --- 보정 설정 --- */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Zap size={18} color="#FF9500" />
            <Text style={styles.sectionTitle}> 선입력 보정</Text>
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
            <Text style={styles.compUnit}>초 먼저 클릭</Text>
          </View>
        )}
      </View>

      {/* --- 목표 시간 --- */}
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

      {/* --- 메인 버튼 --- */}
      <TouchableOpacity 
        style={[styles.mainStartBtn, isRunning && styles.mainStopBtn]} 
        onPress={() => {
          if (!activeMode && !isRunning) { // 실행 중일 땐 취소 가능하게
             Alert.alert("알림", "먼저 위치나 객체를 지정해주세요.");
             return;
          }
          setIsRunning(!isRunning);
        }}
      >
        {isRunning ? <Square color="#FFF" fill="#FFF" /> : <Play color="#FFF" fill="#FFF" />}
        <Text style={styles.mainStartBtnText}>{isRunning ? ' 대기 취소' : ' 클릭 대기 시작'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 40, marginBottom: 15, textAlign: 'center', color: '#1C1C1E' },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 15, elevation: 2 },
  label: { fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 'bold' },
  pickerContainer: { borderWidth: 1, borderColor: '#EEE', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  urlRow: { flexDirection: 'row', marginBottom: 15 },
  urlInput: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  syncBtn: { backgroundColor: '#007AFF', width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  // [수정] 시간 텍스트 레이아웃
  timeContainer: { alignItems: 'center', justifyContent: 'center', height: 60 },
  timeText: { 
    fontSize: 42, // 기본 크기
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#000',
    includeFontPadding: false, // 안드로이드 상하 여백 제거
    fontVariant: ['tabular-nums'], // 숫자 너비 고정
    width: '100%'
  },
  msText: { fontSize: 24, color: '#007AFF' },
  
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modeBtn: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  modeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  modeBtnText: { marginTop: 10, fontWeight: 'bold', color: '#007AFF' },
  modeTextColor: { color: '#FFF' },
  settingLink: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  settingLinkText: { color: '#888', fontSize: 12 },
  
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#3A3A3C' },
  compInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  compInput: { backgroundColor: '#F2F2F7', width: 80, height: 40, borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
  compUnit: { marginLeft: 10, color: '#8E8E93' },
  targetInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  timeInput: { backgroundColor: '#F2F2F7', width: 70, height: 60, borderRadius: 12, textAlign: 'center', fontSize: 32, fontWeight: 'bold', color: '#1C1C1E' },
  colon: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 10 },
  mainStartBtn: { backgroundColor: '#34C759', padding: 20, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  mainStopBtn: { backgroundColor: '#FF3B30' },
  mainStartBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
});
