import React, { useState, useEffect } from 'react' ;
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const SITES = [
  { label: '직접 입력', value: 'custom' },
  { label: '네이버', value: 'https://www.naver.com' },
  { label: '인터파크', value: 'https://www.interpark.com' },
  { label: '멜론티켓', value: 'https://ticket.melon.com' },
  { label: '예스24', value: 'https://www.yes24.com' },
  { label: '티켓링크', value: 'https://www.ticketlink.co.kr' },
];

export default function App() {
  // --- 서버 시간 관련 상태 ---
  const [selectedSite, setSelectedSite] = useState('custom');
  const [urlInput, setUrlInput] = useState('');
  const [appliedUrl, setAppliedUrl] = useState('');
  const [serverTime, setServerTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);

  // --- 목표 시간 관련 상태 ---
  const [targetH, setTargetH] = useState('00');
  const [targetM, setTargetM] = useState('00');
  const [targetS, setTargetS] = useState('00');
  const [isPlus, setIsPlus] = useState(true); // 플마 버튼 상태

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date(Date.now() + timeOffset));
    }, 100);
    return () => clearInterval(timer);
  }, [timeOffset]);

  // 1. 서버 시간 동기화
  const syncServerTime = async () => {
    if (!urlInput.startsWith('http')) {
      Alert.alert("알림", "URL을 확인해주세요.");
      return;
    }
    const start = Date.now();
    try {
      const response = await fetch(urlInput, { method: 'HEAD', cache: 'no-store' });
      const serverDateStr = response.headers.get('Date');
      if (serverDateStr) {
        const end = Date.now();
        const latency = (end - start) / 2;
        const offset = new Date(serverDateStr).getTime() + latency - end;
        setTimeOffset(offset);
        setAppliedUrl(urlInput);
      }
    } catch (e) {
      Alert.alert("에러", "동기화 실패");
    }
  };

  // 2. 목표 시간 복사 함수들
  const copyFromServer = (type) => {
    const current = new Date(Date.now() + timeOffset);
    let h = current.getHours();
    let m = current.getMinutes();
    let s = 0;

    if (type === 'NOW') {
      s = current.getSeconds();
    } else if (type === '30MIN') {
      if (m < 30) m = 30;
      else { m = 0; h = (h + 1) % 24; }
    } else if (type === 'HOUR') {
      m = 0; h = (h + 1) % 24;
    }

    setTargetH(h.toString().padStart(2, '0'));
    setTargetM(m.toString().padStart(2, '0'));
    setTargetS(s.toString().padStart(2, '0'));
  };

  // 3. 시간 미세 조정 함수
  const adjustTarget = (unit, value) => {
    const sign = isPlus ? 1 : -1;
    const amount = value * sign;

    if (unit === 'H') {
      let newH = (parseInt(targetH) + amount) % 24;
      if (newH < 0) newH += 24;
      setTargetH(newH.toString().padStart(2, '0'));
    } else if (unit === 'M') {
      let newM = (parseInt(targetM) + amount) % 60;
      if (newM < 0) newM += 60;
      setTargetM(newM.toString().padStart(2, '0'));
    } else if (unit === 'S') {
      let newS = (parseInt(targetS) + amount) % 60;
      if (newS < 0) newS += 60;
      setTargetS(newS.toString().padStart(2, '0'));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>정밀 서버 시간 클릭커</Text>
      
      {/* 서버 시간 표시 */}
      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>현재 서버 시간 ({appliedUrl ? '동기화됨' : '미동기화'})</Text>
        <Text style={styles.timeText}>
          {serverTime.toLocaleTimeString('ko-KR', { hour12: false })}
          <Text style={styles.msText}>.{serverTime.getMilliseconds().toString().padStart(3, '0')}</Text>
        </Text>
      </View>

      {/* 서버 주소 설정 줄 */}
      <View style={styles.inputRow}>
        <View style={styles.pickerBox}>
          <Picker selectedValue={selectedSite} onValueChange={(v) => { setSelectedSite(v); if(v!=='custom') setUrlInput(v); }}>
            {SITES.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
          </Picker>
        </View>
        <TextInput style={styles.urlInput} value={urlInput} onChangeText={setUrlInput} placeholder="https://" />
        <TouchableOpacity style={[styles.btn, urlInput === appliedUrl && styles.btnOff]} onPress={syncServerTime} disabled={urlInput === appliedUrl}>
          <Text style={styles.btnText}>{urlInput === appliedUrl ? '완료' : '적용'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* 목표 시간 설정 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>목표 시간 설정</Text>
          <View style={styles.copyBtnRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyFromServer('NOW')}><Text style={styles.copyBtnText}>서버시간</Text></TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyFromServer('30MIN')}><Text style={styles.copyBtnText}>다음 30분</Text></TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyFromServer('HOUR')}><Text style={styles.copyBtnText}>다음 정각</Text></TouchableOpacity>
          </View>
        </View>

        {/* 시간 입력 및 조정 UI */}
        <View style={styles.targetTimeBox}>
          <View style={styles.timeInputGroup}>
            <View>
              <TextInput style={styles.timeInput} value={targetH} keyboardType="numeric" onChangeText={setTargetH} />
              <View style={styles.adjRow}>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('H', 10)}><Text style={styles.adjBtnText}>10</Text></TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('H', 1)}><Text style={styles.adjBtnText}>1</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.colon}>:</Text>
            <View>
              <TextInput style={styles.timeInput} value={targetM} keyboardType="numeric" onChangeText={setTargetM} />
              <View style={styles.adjRow}>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('M', 10)}><Text style={styles.adjBtnText}>10</Text></TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('M', 1)}><Text style={styles.adjBtnText}>1</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.colon}>:</Text>
            <View>
              <TextInput style={styles.timeInput} value={targetS} keyboardType="numeric" onChangeText={setTargetS} />
              <View style={styles.adjRow}>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('S', 10)}><Text style={styles.adjBtnText}>10</Text></TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget('S', 1)}><Text style={styles.adjBtnText}>1</Text></TouchableOpacity>
              </View>
            </View>
            
            {/* 플러스/마이너스 토글 */}
            <TouchableOpacity 
              style={[styles.plusMinusBtn, {backgroundColor: isPlus ? '#FF3B30' : '#007AFF'}]} 
              onPress={() => setIsPlus(!isPlus)}
            >
              <Text style={styles.plusMinusText}>{isPlus ? '+' : '-'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.mainStartBtn}>
        <Text style={styles.mainStartBtnText}>티켓팅 시작 대기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 15 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 40, marginBottom: 20, textAlign: 'center' },
  timeCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  timeLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 5 },
  timeText: { fontSize: 32, fontWeight: 'bold', color: '#1C1C1E' },
  msText: { fontSize: 18, color: '#007AFF' },
  inputRow: { flexDirection: 'row', height: 45, marginBottom: 10 },
  pickerBox: { flex: 1.2, backgroundColor: '#E5E5EA', borderRadius: 8, marginRight: 5, overflow: 'hidden', justifyContent: 'center' },
  urlInput: { flex: 2, backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#D1D1D6', marginRight: 5 },
  btn: { flex: 0.8, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnOff: { backgroundColor: '#C7C7CC' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#D1D1D6', marginVertical: 15 },
  section: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20 },
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  copyBtnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  copyBtn: { backgroundColor: '#E5E5EA', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, flex: 1, marginHorizontal: 2 },
  copyBtnText: { fontSize: 11, textAlign: 'center', color: '#1C1C1E' },
  targetTimeBox: { alignItems: 'center' },
  timeInputGroup: { flexDirection: 'row', alignItems: 'flex-start' },
  timeInput: { backgroundColor: '#F2F2F7', width: 60, height: 50, borderRadius: 8, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
  colon: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 5, marginTop: 10 },
  adjRow: { flexDirection: 'row', marginTop: 5, justifyContent: 'space-between' },
  adjBtn: { backgroundColor: '#8E8E93', width: 28, height: 22, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  adjBtnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  plusMinusBtn: { marginLeft: 15, width: 40, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  plusMinusText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  mainStartBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 50 },
  mainStartBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
