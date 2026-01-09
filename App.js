import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Keyboard } from 'react-native';

export default function App() {
  const [time, setTime] = useState("로딩 중...");
  const [offset, setOffset] = useState(0);
  const [targetTime, setTargetTime] = useState("14:00:00"); // 목표 시간
  const [isRunning, setIsRunning] = useState(false);

  // 서버 시간 동기화
  const syncTime = async () => {
    try {
      const start = Date.now();
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
      const data = await res.json();
      const end = Date.now();
      const latency = (end - start) / 2;
      setOffset(new Date(data.datetime).getTime() + latency - end);
      alert("서버 시간 동기화 성공!");
    } catch (e) { alert("연결 실패"); }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date(Date.now() + offset);
      const currentTimeStr = now.toLocaleTimeString('en-GB', { hour12: false }) + "." + now.getMilliseconds().toString().padStart(3, '0');
      setTime(currentTimeStr);

      // 목표 시간에 도달했는지 체크 (나중에 클릭 로직이 들어갈 자리)
      if (isRunning && currentTimeStr.startsWith(targetTime)) {
        console.log("목표 시간 도달! 클릭 시도!");
        // 여기서 실제 클릭 명령을 보낼 예정입니다.
      }
    }, 10);
    return () => clearInterval(timer);
  }, [offset, isRunning, targetTime]);

  return (
    <View style={styles.container} onStartShouldSetResponder={() => Keyboard.dismiss()}>
      <Text style={styles.label}>현재 서버 시간</Text>
      <Text style={styles.timeText}>{time}</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>목표 시간 설정 (HH:mm:ss)</Text>
        <TextInput 
          style={styles.input} 
          value={targetTime} 
          onChangeText={setTargetTime}
          placeholder="14:00:00"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.syncButton} onPress={syncTime}>
          <Text style={styles.btnText}>시간 동기화</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.runButton, isRunning && styles.stopButton]} 
          onPress={() => setIsRunning(!isRunning)}
        >
          <Text style={styles.btnText}>{isRunning ? "중단" : "자동 클릭 시작"}</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.footer}>* 실제 클릭 기능은 권한 설정 후 활성화됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', padding: 20 },
  label: { color: '#888', fontSize: 14, marginBottom: 5 },
  timeText: { color: '#00FF00', fontSize: 45, fontWeight: 'bold', marginBottom: 40, fontFamily: 'monospace' },
  inputContainer: { width: '100%', alignItems: 'center', marginBottom: 30 },
  input: { width: '80%', height: 50, backgroundColor: '#222', color: '#fff', borderRadius: 10, textAlign: 'center', fontSize: 20, borderWidth: 1, borderColor: '#444' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  syncButton: { backgroundColor: '#333', padding: 15, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  runButton: { backgroundColor: '#1E90FF', padding: 15, borderRadius: 10, minWidth: 150, alignItems: 'center' },
  stopButton: { backgroundColor: '#FF4500' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  footer: { color: '#555', fontSize: 12, marginTop: 40 }
});
