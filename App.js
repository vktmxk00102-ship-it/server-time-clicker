import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

// 네이티브 모듈 불러오기 (에러 방지를 위한 예외 처리 포함)
let ClickerCore;
try {
  ClickerCore = requireNativeModule('ClickerCore');
} catch (e) {
  console.error("Native Module Load Error:", e);
}

export default function App() {
  const [mode, setMode] = useState('site');
  const [url, setUrl] = useState('https://www.google.com');
  const [serverTime, setServerTime] = useState(new Date());
  const [targetTime, setTargetTime] = useState({ h: '10', m: '00', s: '00' });
  const [clickMethod, setClickMethod] = useState('coordinate');

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // [지정 및 실행] 버튼 클릭 시 호출
  const handleStart = async () => {
    if (ClickerCore && ClickerCore.startOverlay) {
      try {
        ClickerCore.startOverlay();
      } catch (e) {
        Alert.alert("에러", "네이티브 기능을 실행할 수 없습니다.");
      }
    } else {
      Alert.alert(
        "네이티브 모듈 미인식",
        "APK 빌드가 필요합니다. Expo Go에서는 작동하지 않습니다."
      );
    }
  };

  // [타겟 앱 선택] 클릭 시 호출
  const handleOpenSettings = () => {
    if (ClickerCore && ClickerCore.openAccessibilitySettings) {
      ClickerCore.openAccessibilitySettings();
    } else {
      Alert.alert("알림", "설정 화면을 열 수 없습니다.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚀 서버 시간 클릭커</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setMode('site')} style={[styles.tab, mode === 'site' && styles.activeTab]}>
          <Text style={mode === 'site' ? styles.activeText : styles.inactiveText}>1. 사이트</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('app')} style={[styles.tab, mode === 'app' && styles.activeTab]}>
          <Text style={mode === 'app' ? styles.activeText : styles.inactiveText}>2. 활성앱</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputSection}>
        {mode === 'site' ? (
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://" />
          </View>
        ) : (
          <TouchableOpacity style={styles.appPicker} onPress={handleOpenSettings}>
            <Text>타겟 앱 선택 (접근성 설정 이동)</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>현재 서버 시간 (예상)</Text>
        <Text style={styles.timeText}>{serverTime.toLocaleTimeString('ko-KR', { hour12: false })}</Text>
      </View>

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
  appPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 15, alignItems: 'center' },
  timeCard: { backgroundColor: '#212529', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 25 },
  timeLabel: { color: '#ADB5BD', fontSize: 14, marginBottom: 5 },
  timeText: { color: '#00FF00', fontSize: 42, fontWeight: 'bold' },
  configSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#495057' },
  timeInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  timeInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, width: 60, padding: 10, textAlign: 'center', fontSize: 20 },
  colon: { fontSize: 20, marginHorizontal: 10, fontWeight: 'bold' },
  mainBtn: { backgroundColor: '#2196F3', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
