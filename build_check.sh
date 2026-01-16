#!/bin/bash

# 1. 최신 소스 가져오기
echo "🔄 [1/4] Git Pull 실행 중..."
git pull origin main

# 2. 의존성 설치 (npm 환경)
echo "📦 [2/4] 의존성 설치 중..."
npm install

# 3. Expo 환경 진단
echo "🩺 [3/4] Expo Doctor 실행 중 (환경 점검)..."
npx expo doctor

# 4. 안드로이드 빌드 폴더로 이동 후 빌드 실행
echo "🏗️ [4/4] APK 빌드 시작 (./gradlew assembleRelease)..."
cd android

# 이전 빌드 기록 삭제 (충돌 방지)
./gradlew clean

# 실제 빌드 수행
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    echo "📍 APK 위치: android/app/build/outputs/apk/release/app-release.apk"
else
    echo "❌ 빌드 실패! 위 로그를 확인하세요."
    exit 1
fi
