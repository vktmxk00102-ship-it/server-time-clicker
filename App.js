import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import ClickerCoreModule from './modules/expo-clicker-core';

export default function App() {
  const [url, setUrl] = useState('https://www.naver.com');
  const [offset, setOffset] = useState(0);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);

  // 1. 서버 시간 동기화 (결과를 Alert으로 확인)
  const syncTime = async () => {
    try {
      const result = await ClickerCoreModule.getServerTimeOffset(url);
      if (result.startsWith("ERROR")) {
        Alert.alert("동기화 실패", result);
      } else {
        const numOffset = parseFloat(result);
        setOffset(numOffset);
        Alert.alert("성공", `서버와의 차이: ${numOffset}ms`);
      }
    } catch (e) {
      Alert.alert("JS 에러 (Sync)", e.message);
    }
  };

  // 2. 설정 창 열기 (가장 중요한 에러 추적 포인트)
  const openSettings = async () => {
    try {
      const result = await ClickerCoreModule.openSettings();
      if (result !== "OK") {
        // 앱이 꺼지지 않고 여기에 에러 이유가 떠야 합니다.
        Alert.alert("네이티브 설정 에러", result);
      }
    } catch (e) {
      Alert.alert("JS 에러 (Settings)", e.message);
    }
  };

  // 3. 오버레이 표시 (지정 버튼)
  const showOverlay = async () => {
    try {
      const isPermissionGranted = await ClickerCoreModule.checkOverlayPermission();
      if (!isPermissionGranted) {
        Alert.alert("권한 필요", "다른 앱 위에 표시 권한을 먼저 허용해주세요.");
        return;
      }

      const result = await ClickerCoreModule.showOverlay("LOCATION");
      if (result !== "OK") {
        Alert.alert("오버레이 에러", result);
      }
    } catch (e) {
      Alert.alert("JS 에러 (Overlay)", e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>서버시간 클릭커 (안드로이드 16 대응)</Text>
      
      <View style={styles.section}>
        <TextInput 
          style={styles.input} 
          value={url} 
          onChangeText={setUrl} 
          placeholder="URL 입력 (https://...)"
        />
        <TouchableOpacity style={styles.button} onPress={syncTime}>
          <Text style={styles.buttonText}>서버 시간 동기화</Text>
        </TouchableOpacity>
        <Text>현재 오프셋: {offset} ms</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.button, {backgroundColor: '#666'}]} onPress={openSettings}>
          <Text style={styles.buttonText}>1. 권한 설정 바로가기</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, {backgroundColor: '#f44336'}]} onPress={showOverlay}>
          <Text style={styles.buttonText}>2. 위치 지정 (십자선)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>※ 버튼 클릭 시 앱이 꺼진다면 메시지를 복사해서 알려주세요.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  section: {
    width: '100%',
    marginBottom: 25,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  buttonText: {
    color: '#white',
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  }
});
