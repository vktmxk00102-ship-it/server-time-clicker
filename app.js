import React, { useState, useEffect } from 'react';
// 네이티브 전용 컴포넌트들입니다.
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';

export default function App() {
  const [serverTime, setServerTime] = useState(null);
  const [offset, setOffset] = useState(0);
  const [targetTime, setTargetTime] = useState('10:00:00'); // 목표 시간 설정1

  // 1. 서버 시간 동기화 (ES8 async/await)
  const syncTime = async () => {
    try {
      const start = Date.now();
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
      const data = await res.json();
      const end = Date.now();
      
      const latency = (end - start) / 2;
      const actualServerMs = new Date(data.datetime).getTime() + latency;
      setOffset(actualServerMs - end);
      alert('서버 시간 동기화 완료!');
    } catch (e) {
      alert('네트워크 연결을 확인하세요.');
    }
  };

  // 2. 10ms 단위 정밀 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(Date.now() + offset);
    }, 10);
    return () => clearInterval(timer);
  }, [offset]);

  const renderTime = (time) => {
    if (!time) return "00:00:00.000";
    const d = new Date(time);
    return d.toTimeString().split(' ')[0] + '.' + d.getMilliseconds().toString().padStart(3, '0');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>현재 서버 시간</Text>
      <Text style={styles.timeText}>{renderTime(serverTime)}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>목표 시간 (HH:mm:ss)</Text>
        <TextInput 
          style={styles.input} 
          value={targetTime} 
          onChangeText={setTargetTime}
          placeholder="예: 10:00:00"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={syncTime}>
        <Text style={styles.buttonText}>서버 시간 동기화</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#888', fontSize: 14, marginBottom: 5 },
  timeText: { color: '#00FF00', fontSize: 40, fontWeight: 'bold', marginBottom: 40 },
  inputGroup: { width: '80%', marginBottom: 30 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, textAlign: 'center', fontSize: 20 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
