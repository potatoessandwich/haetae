# 해태 표본실

광화문 월대 해태상 한 쌍(국가유산청 3D 데이터)을 활용한 인터랙티브 웹전시.
표본을 관찰하고, 두 표본을 겹쳐 실시간으로 비교 절개할 수 있다.

## 로컬 실행

```bash
cd gwanghwamun-haetae-exhibit
python3 -m http.server 8842
```

브라우저에서 `http://localhost:8842` 접속.

## 구조

```
index.html          메인 (제목 + 시작)
list.html            표본 선택 (A / B / COMPARE)
detail.html           표본 관찰 · 비교 절개
css/style.css         공통 스타일
js/main.js            메인 화면 로직
js/list.js             표본 선택 로직
js/detail.js           3D 뷰어, 카메라 이동, 비교 절개 클리핑
js/sound.js            Web Audio 합성 효과음 (외부 음원 없음)
data/specimens.json    표본 사실 정보 (명칭·출처·라이선스·관찰 부위)
assets/models/          해태상 A·B GLB (국가유산청 KHS, CC BY 4.0)
```

## 구현 범위

- 완료: 메인·목록·상세(관찰/비교 절개) 페이지, GLB 로딩·회전·확대·조명 이동·와이어프레임,
  관찰 부위 카메라 이동, A/B 실시간 클리핑 비교 절개, 사실/연출 구분 문구, 출처·라이선스 표기
- 다음 단계(미구현): 차이의 상처(거리 시각화), 부위 이식·봉합·복원 — Blender에서 A/B를 동일
  기준으로 5부위(머리·몸통·앞발·뒷발·꼬리) 사전 분할해야 구현 가능

## 데이터 출처

- 광화문 해태상 A(서쪽): https://sketchfab.com/3d-models/gwanghwamun-gate-haetaea-e11f9ee66df74288be83f9fede578bd4
- 광화문 해태상 B(동쪽): https://sketchfab.com/3d-models/gwanghwamun-gate-haetaeb-006b419b44b945ea88d5a594acfb22b9
- 제작·게시: 국가유산청 KOREA HERITAGE SERVICE [KHS] — https://sketchfab.com/KHS_Asset
- 라이선스: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)

## GitHub Pages 배포

저장소에 push한 뒤 Settings → Pages → Branch를 `main` / `(root)` 로 지정하면
`https://<사용자명>.github.io/<저장소명>/` 에서 바로 열람 가능하다.
