import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
// 커스텀 네이티브 모듈 불러오기
import ClickerCore from 'expo-clicker-core';

export default function App() {
  const [mode, setMode] = useState('site');
  const [url, setUrl] = useState('https://www.google.com');
  const [serverTime, setServerTime] = useState(new Date());
  const [targetTime, setTargetTime] = useState({ h: '10', m: '00', s: '00' });

  // 1. 앱 실행 시 안드로이드 13~16 필수 알림 권한 요청
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        } catch (err) {
          console.warn(err);
        }
      }
    };
    requestPermission();

    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. [지정 및 실행] - 오버레이 버튼 띄우기
  const handleStart = async () => {
    try {
      if (ClickerCore && typeof ClickerCore.startOverlay === 'function') {
        // 네이티브 모듈 호출 (권한 없으면 권한 설정창으로, 있으면 서비스 시작)
        ClickerCore.startOverlay();
      } else {
        Alert.alert("연결 오류", "네이티브 모듈을 찾을 수 없습니다. 빌드 로그를 확인하세요.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("실행 에러", "서비스 시작 중 오류가 발생했습니다.");
    }
  };

  // 3. [타겟 앱 선택] - 접근성 설정 화면 이동
  const handleOpenSettings = () => {
    try {
      if (ClickerCore && typeof ClickerCore.openAccessibilitySettings === 'function') {
        ClickerCore.openAccessibilitySettings();
      } else {
        Alert.alert("알림", "접근성 설정 모듈이 없습니다.");
      }
    } catch (e) {
      Alert.alert("에러", "설정 화면 이동 실패");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚀 서버 시간 클릭커</Text>

      {/* 모드 선택 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          onPress={() => setMode('site')} 
          style={[styles.tab, mode === 'site' && styles.activeTab]}
        >
          <Text style={mode === 'site' ? styles.activeText : styles.inactiveText}>1. 사이트</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setMode('app')} 
          style={[styles.tab, mode === 'app' && styles.activeTab]}
        >
          <Text style={mode === 'app' ? styles.activeText : styles.inactiveText}>2. 활성앱</Text>
        </TouchableOpacity>
      </View>

      {/* 입력 영역 */}
      <View style={styles.inputSection}>
        {mode === 'site' ? (
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.input} 
              value={url} 
              onChangeText={setUrl} 
              placeholder="https://..." 
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.appPicker} onPress={handleOpenSettings}>
            <Text style={styles.appPickerText}>타겟 앱 선택 (접근성 서비스 활성화)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 시간 표시 */}
      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>현재 서버 시간 (예상)</Text>
        <Text style={styles.timeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
        </Text>
      </View>

      {/* 목표 시간 설정 */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>목표 시간 (시:분:초)</Text>
        <View style={styles.timeInputRow}>
          <TextInput style={styles.timeInput} value={targetTime.h} keyboardType="numeric" maxLength={2} />
          <Text style={styles.colon}>:</Text>
          <TextInput style={styles.timeInput} value={targetTime.m} keyboardType="numeric" maxLength={2} />
          <Text style={styles.colon}>:</Text>
          <TextInput style={styles.timeInput} value={targetTime.s} keyboardType="numeric" maxLength={2} />
        </View>
      </View>

      {/* 메인 실행 버튼 */}
      <TouchableOpacity style={styles.mainBtn} onPress={handleStart}>
        <Text style={styles.mainBtnText}>지정 및 실행</Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        * 안드로이드 16: 알림 권한과 '다른 앱 위에 표시' 권한이 필수입니다.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#F8F9FA' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 10, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  activeText: { fontWeight: 'bold', color: '#2196F3' },
  inactiveText: { color: '#6C757D' },
  inputSection: { marginBottom: 25 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 12 },
  appPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 15, alignItems: 'center' },
  appPickerText: { color: '#2196F3', fontWeight: '500' },
  timeCard: { backgroundColor: '#212529', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 25 },
  timeLabel: { color: '#ADB5BD', fontSize: 14, marginBottom: 5 },
  timeText: { color: '#00FF00', fontSize: 42, fontWeight: 'bold' },
  configSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#495057' },
  timeInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  timeInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, width: 65, padding: 10, textAlign: 'center', fontSize: 20 },
  colon: { fontSize: 20, marginHorizontal: 10, fontWeight: 'bold' },
  mainBtn: { backgroundColor: '#2196F3', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 }
});
