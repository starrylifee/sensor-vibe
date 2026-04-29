# 센서 게임 제작 규격

이 문서는 새 밝기/초음파 센서 게임을 만들 때 AI가 반드시 따라야 하는 프로젝트 규격이다. 새 게임을 만들거나 기존 게임을 고칠 때 먼저 이 문서를 읽는다.

## 1. 교육 목적

이 프로젝트의 1순위 목표는 학생이 센서를 직접 연결하고 센서 값 변화로 게임 반응을 이해하는 것이다.

금지:
- 학생이 키보드만으로 게임을 즐길 수 있게 만들기
- 캔버스 클릭/터치가 센서 행동을 대신하게 만들기
- 시작 화면에 "키보드 가능", "클릭 가능", "터치 가능" 같은 우회 조작 안내를 노출하기

허용:
- 시작, 재시작, 설정 열기, 설정 닫기, 센서 연결, 난이도 선택 같은 UI 버튼 클릭
- 교사용 디버깅 목적의 키보드/마우스 보조 입력. 단, 반드시 `js/keyboard-lock.js` 잠금을 통과해야 한다.

## 2. 필수 파일 구조

각 게임은 루트에 단일 HTML 파일로 둔다.

필수 스크립트 순서:

```html
<script src="js/serial.js"></script>
<script src="js/keyboard-lock.js"></script>
```

`js/keyboard-lock.js`는 직접 복사하거나 재구현하지 않는다.

## 3. 공통 UI 골격

새 게임은 다음 구조를 기본으로 사용한다.

```html
<div id="topbar">
  <a href="index.html">← 목록</a>
  <!-- 점수, 최고점, 생명, 시간 등 핵심 상태 -->
  <div>
    <button class="ctrl" id="hcToggle" onclick="toggleHC()">☀️</button>
    <button class="ctrl" id="settBtn">⚙️</button>
  </div>
</div>

<div id="gameWrap">
  <canvas id="gc"></canvas>
  <!-- startPanel, overPanel 등 overlay -->
</div>

<div id="sensorBar">
  <span class="label">밝기</span>
  <div id="sensorMeter"><div id="sensorFill"></div></div>
  <span id="sensorVal">--</span>
  <button class="ctrl" id="connectBtn">🔌 연결</button>
</div>

<div id="settPanel">
  <h3>⚙️ 센서 · 입력 설정</h3>
  <!-- 센서 테스트 박스, 기준값, 난이도, 교사용 입력 카드 -->
  <button class="btn" id="closeSett">닫기</button>
</div>
```

규칙:
- 설정 패널 ID는 `settPanel`을 우선 사용한다.
- 닫기 버튼 ID는 `closeSett`를 우선 사용한다.
- `topbar`, `sensorBar`, 오른쪽 설정 패널을 모든 게임에서 같은 위치 흐름으로 유지한다.
- 외계인 슈팅처럼 별도 고정 버튼 UI를 만들지 않는다.
- `index.html`의 탭 구분은 `교사 작품`과 `학생 작품`을 유지한다.

## 4. 교사용 입력 잠금

모든 게임은 `js/keyboard-lock.js`를 포함해야 한다.

현재 잠금 규칙:
- 기본값은 잠김
- 비밀번호는 `shindap`
- 잠금 상태에서는 Space, Enter, 방향키, WASD, Z/X, Ctrl 등이 차단된다.
- 잠금 상태에서는 캔버스 클릭/터치 액션도 차단된다.
- 설정 패널 안에 `교사용 입력` 카드가 자동 삽입된다.

입력 모드 select 값 규칙:
- `sensor`: 학생 기본 모드
- `keyboard`: 교사용 키보드 모드
- `mouse`: 교사용 마우스/터치 모드
- `both`: 교사용 혼합 모드
- `keyboard+mouse`: 교사용 혼합 모드

잠금 스크립트는 `keyboard`, `mouse`, `both`, `keyboard+mouse` 옵션을 잠김 상태에서 비활성화한다. 학생용 기본값은 가능하면 `sensor`로 둔다.

게임 코드 안에서 교사용 입력을 직접 처리해야 할 때는 추가로 다음 가드를 둔다.

```js
if (!window.TeacherControlLock?.isUnlocked()) return;
```

## 5. 클릭/터치 정책

센서 행동을 대체하는 캔버스 입력은 만들지 않는다.

금지 예:
- 아이스크림 스쿱: 캔버스 클릭으로 스쿱 떨어뜨리기
- 바나나 달리기: 캔버스 클릭/터치로 점프
- 점프맵: 캔버스 클릭/터치로 점프
- 그림자 피하기: 캔버스 클릭/터치로 좌우 이동
- 외계인 슈팅: 터치로 발사

예외:
- 비행기 게임의 마우스 이동처럼 설계상 포인터 위치가 핵심인 경우
- 초음파 패들, 시소 균형의 교사용 마우스 fallback처럼 설정에서 교사용 입력으로만 쓰는 경우

예외를 만들 때도 시작 화면에 클릭/마우스 안내를 노출하지 않는다.

## 6. 밝기 센서 게임 규격

밝기 센서는 아날로그 값 `0~1023`을 기본으로 본다.

일반 해석:
- 밝음: 값이 큼
- 어두움/가림: 값이 작음
- 기본 기준값: `300`

권장 코드:

```js
const serial = new SerialManager();
let sensorVal = 1023;
const cfg = { threshold: 300, inputMode: 'sensor' };

serial.onData(v => {
  sensorVal = v;
  updateSensorUI(v);
});
```

밝기 센서 게임 디자인 주의:
- 센서 수신 딜레이를 고려한다.
- 너무 짧은 타이밍 게임을 만들지 않는다.
- 점프맵은 쉽게 만든다. 플랫폼 간격, 장애물 간격, 착지 여유를 넓게 둔다.
- 센서 반응을 최소 400~700ms 정도 유지해도 성공 가능해야 한다.
- 실패 원인이 센서 지연인지 학생 실수인지 애매한 구조를 피한다.

## 7. 초음파 센서 게임 규격

초음파 센서는 거리(cm)를 기본으로 본다.

권장 코드:

```js
const serial = new SerialManager();
let distance = 20;
const cfg = { maxDist: 40, inputMode: 'sensor' };

serial.onData(v => {
  distance = v;
  updateSensorUI(v);
});
```

디자인 주의:
- 거리는 튀는 값이 들어올 수 있으므로 완만하게 보정한다.
- 손 위치가 조금 흔들려도 플레이가 가능해야 한다.
- 너무 정밀한 픽셀 조작을 요구하지 않는다.

## 8. 센서 UI 표시

설정 패널에는 센서 테스트 박스를 둔다.

필수 요소:
- 현재 센서 값 큰 숫자
- 센서 값 막대
- 기준값 설명
- 반응 중 표시

예:

```html
<div class="testbox">
  <div class="bigv" id="tBigV">--</div>
  <div class="hint">현재 밝기 센서 값 (0~1023)</div>
  <div class="testbar"><div id="tBar"></div></div>
  <div class="jump-ind" id="jumpInd">반응 중</div>
</div>
```

하단 `sensorBar`도 같은 센서 값을 보여준다.

## 9. 고대비 모드

모든 게임은 고대비 모드를 지원한다.

```js
let hcMode = localStorage.getItem('hc_mode') === '1';
function applyHC() {
  document.body.classList.toggle('hc', hcMode);
  const btn = document.getElementById('hcToggle');
  if (btn) btn.textContent = hcMode ? '🌙' : '☀️';
}
function toggleHC() {
  hcMode = !hcMode;
  localStorage.setItem('hc_mode', hcMode ? '1' : '0');
  applyHC();
}
applyHC();
```

CSS에는 `body.hc` 색상 규칙을 둔다.

## 10. 점수와 저장소 키

최고점은 `localStorage`에 저장한다.

권장 키 이름:
- `게임이름_hi`
- 예: `icecream_hi`, `bananarunner_hi`, `alienshoot_hi`

새 키를 만들면 `index.html`의 최고점 표시도 함께 연결한다.

## 11. 새 게임 추가 체크리스트

새 게임을 만들면 다음을 모두 확인한다.

- `index.html` 학생 작품 또는 교사 작품 탭에 카드 추가
- `js/serial.js` 포함
- `js/keyboard-lock.js` 포함
- `topbar`, `gameWrap`, `sensorBar`, `settPanel` 구조 사용
- 기본 입력은 `sensor`
- 캔버스 클릭/터치가 센서 행동을 대신하지 않음
- 시작 화면에 키보드/클릭/터치 안내 없음
- 설정 패널에 센서 테스트 박스 있음
- 고대비 모드 있음
- 모바일/데스크톱에서 글자가 겹치지 않음
- `.claude/settings.local.json` 커밋 제외

## 12. 검증 명령

스크립트 문법 검사:

```powershell
node --check js\keyboard-lock.js
```

전체 HTML inline script 문법 검사:

```powershell
node -e "const fs=require('fs'); const files=fs.readdirSync('.').filter(f=>f.endsWith('.html')); for (const f of files){ const s=fs.readFileSync(f,'utf8'); const scripts=[...s.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]); for (let i=0;i<scripts.length;i++){ try{ new Function(scripts[i]); } catch(e){ console.error(f+': inline script '+(i+1)+': '+e.message); process.exitCode=1; } } } if(!process.exitCode) console.log('inline scripts ok');"
```

캔버스 클릭/터치 액션 검색:

```powershell
Select-String -Path *.html -Pattern "canvas.addEventListener\('pointerdown'|canvas.addEventListener\('click'|canvas.addEventListener\('mousedown'|canvas.addEventListener\('touchstart'"
```

이 검색 결과는 예외 게임만 남아야 한다. 현재 허용 예외는 비행기처럼 마우스 위치가 설계상 필요한 경우다.

Git 상태 확인:

```powershell
git status --short
```

커밋 전 `.claude/settings.local.json`은 스테이징하지 않는다.
