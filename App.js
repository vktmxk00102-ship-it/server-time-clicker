import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function App() {
  const [time, setTime] = useState("로딩 중...");
  const [offset, setOffset] = useState(0);

  const syncTime = async () => {
    try {
      const start = Date.now();
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
      const data = await res.json();
      const end = Date.now();
      const latency = (end - start) / 2;
      setOffset(new Date(data.datetime).getTime() + latency - end);
      alert("서버 시간 동기화 완료!");
    } catch (e) { alert("연결 실패"); }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date(Date.now() + offset);
      setTime(now.toLocaleTimeString() + "." + now.getMilliseconds().toString().padStart(3, '0'));
    }, 10);
    return () => clearInterval(timer);
  }, [offset]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Server Timer</Text>
      <Text style={styles.timeText}>{time}</Text>
      <TouchableOpacity style={styles.button} onPress={syncTime}>
        <Text style={styles.btnText}>SYNC TIME</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#888', fontSize: 18 },
  timeText: { color: '#FFD700', fontSize: 40, fontWeight: 'bold', marginVertical: 30 },
  button: { backgroundColor: '#1E90FF', padding: 15, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
