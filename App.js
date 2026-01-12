import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, NativeModules } from 'react-native';

// 우리가 만든 네이티브 모듈 불러오기
const { ClickerCore } = NativeModules;

export default function App() {
  const [mode, setMode] = useState('site'); // site 또는 app
  const [url, setUrl] = useState('https://www.google.com');
  const [targetApp, setTargetApp] = useState('');
  const [serverTime, setServerTime] = useState(new Date());
  const [targetTime, setTargetTime] = useState({ h: '10', m: '00', s: '00' });
  const [clickMethod, setClickMethod] = useState('coordinate');

  // 1초마다 시계 업데이트 (서버 시간 보정 로직은 이전에 드린 fetch 방식을 결합하면 됩니다)
  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // [핵심] 지정 및 실행 버튼 클릭 시
  const handleStart = async () => {
    try {
      // 1. 접근성 권한 체크 (간략화)
      // 2. PIP 오버레이 시작
      if (ClickerCore && ClickerCore.startOverlay) {
        ClickerCore.startOverlay();
        Alert.alert("안내", "PIP 컨트롤러가 실행되었습니다. 타겟 위치를 지정하세요.");
      } else {
        // 개발 환경(Expo Go)에서는 네이티브 모듈이 작동하지 않으므로 빌드 후 확인 필요
        Alert.alert("알림", "네이티브 모듈을 불러올 수 없습니다. 빌드된 APK에서 테스트하세요.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚀 서버 시간 클릭커</Text>

      {/* 모드 선택 (사이트 / 앱) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setMode('site')} style={[styles.tab, mode === 'site' && styles.activeTab]}>
          <Text style={mode === 'site' ? styles.activeText : styles.inactiveText}>1. 사이트</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('app')} style={[styles.tab, mode === 'app' && styles.activeTab]}>
          <Text style={mode === 'app' ? styles.activeText : styles.inactiveText}>2. 활성앱</Text>
        </TouchableOpacity>
      </View>

      {/* 입력창 및 돋보기 */}
      <View style={styles.inputSection}>
        {mode === 'site' ? (
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://" />
            <TouchableOpacity style={styles.searchBtn}><Text>🔍</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.appPicker} onPress={() => ClickerCore.openAccessibilitySettings()}>
            <Text>{targetApp || "타겟 앱 선택 (접근성 설정 이동)"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 서버 시간 표시 */}
      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>현재 서버 시간 (예상)</Text>
        <Text style={styles.timeText}>{serverTime.toLocaleTimeString('ko-KR', { hour12: false })}</Text>
      </View>

      {/* 목표 시간 설정 */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>목표 시간 (시:분:초)</Text>
        <View style={styles.timeInputRow}>
          <TextInput style={styles.timeInput} value={targetTime.h} keyboardType="numeric" />
          <Text style={styles.colon}>:</Text>
          <TextInput style={styles.timeInput} value={targetTime.m} keyboardType="numeric" />
          <Text style={styles.colon}>:</Text>
          <TextInput style={styles.timeInput} value={targetTime.s} keyboardType="numeric" />
        </View>
      </View>

      {/* 방식 선택 (라디오 버튼 스타일) */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>클릭 방식</Text>
        <View style={styles.radioRow}>
          <TouchableOpacity onPress={() => setClickMethod('coordinate')} style={styles.radioButton}>
            <Text>{clickMethod === 'coordinate' ? '● 화면좌표' : '○ 화면좌표'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setClickMethod('object')} style={styles.radioButton}>
            <Text>{clickMethod === 'object' ? '● 객체방식' : '○ 객체방식'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 실행 버튼 */}
      <TouchableOpacity style={styles.mainBtn} onPress={handleStart}>
        <Text style={styles.mainBtnText}>지정 및 실행</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#F8F9FA' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 10, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  activeText: { fontWeight: 'bold', color: '#2196F3' },
  inactiveText: { color: '#6C757D' },
  inputSection: { marginBottom: 25 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 12 },
  searchBtn: { marginLeft: 10, padding: 12, backgroundColor: '#DEE2E6', borderRadius: 8 },
  appPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 15, alignItems: 'center' },
  timeCard: { backgroundColor: '#212529', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 25 },
  timeLabel: { color: '#ADB5BD', fontSize: 14, marginBottom: 5 },
  timeText: { color: '#00FF00', fontSize: 42, fontWeight: 'bold' },
  configSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#495057' },
  timeInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  timeInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, width: 60, padding: 10, textAlign: 'center', fontSize: 20 },
  colon: { fontSize: 20, marginHorizontal: 10, fontWeight: 'bold' },
  radioRow: { flexDirection: 'row', justifyContent: 'space-around' },
  radioButton: { padding: 10 },
  mainBtn: { backgroundColor: '#2196F3', paddingVertical: 18, borderRadius: 12, alignItems: 'center', elevation: 4 },
  mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
