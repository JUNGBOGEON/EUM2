# Whiteboard 2.0 Improvement Plan

현재 대화 내용을 바탕으로, **고성능 벡터 기반 화이트보드**로 전환하기 위한 기술적 설계 및 수정안을 정리했습니다.

---

## 1. 개요 (Overview)

*   **현재 상태**: `Pixi.js v8` + `WebGPU`를 사용한 고성능 렌더링을 갖추고 있으나, **Immediate Mode (비트맵 방식)**로 동작하여 그려진 객체를 다시 선택하거나 수정할 수 없음.
*   **기술적 한계 (Technical Limitations)**:
    1.  **객체 식별 불가**: 픽셀로 렌더링된 후에는 선(Stroke)에 대한 정보가 소실되어 개별 선택/수정이 불가능함.
    2.  **CPU 병목 (Hit Testing)**: 객체 수가 늘어날 경우 단순 반복문(Loop) 방식의 충돌 감지는 심각한 랙을 유발함.
    3.  **메모리 스파이크**: 무한 캔버스 구현 시 전체 영역을 텍스처로 잡으면 메모리 부족(OOM) 발생 위험 있음.
*   **목표**: **Retained Mode (벡터 객체 방식)**로 전환하여 **"객체 선택, 이동, 이미지 삽입"** 기능을 구현하면서도, 대량의 객체(1만 개 이상)를 렉 없이 처리하는 최적화 구조 도입.

---

## 2. 핵심 아키텍처 변경 (Core Architecture)
### A. 렌더링 엔진: 하이브리드 베이킹 (Hybrid Baking)
"수정 가능성(Vector)"과 "성능(Bitmap)"을 동시에 잡기 위한 전략입니다.

| 구분 | 동작 방식 | 부하 (CPU/GPU) |
| :--- | :--- | :--- |
| **Idle (평상시)** | 화면에 보이는 영역을 **타일(Tile) 단위 텍스처(이미지)**로 구워서 보여줌. | **Zero Overhead** (이미지 1장 렌더링) |
| **Interact (상호작용)** | 마우스를 가져가거나 선택하면, 해당 객체만 **벡터(Vector)**로 실시간 전환. | **Low** (선택된 소수 객체만 연산) |
| **Commit (완료)** | 편집이 끝나면 다시 텍스처로 구워서(Baking) 박제. | **Momentary** (마우스 떼는 순간 1회 연산) |

*   **메모리 전략**: 무한 캔버스를 통째로 굽지 않고, 화면에 보이는 **Viewport** 영역만 굽는 **Tile Caching** 기법 사용 (Google Maps 방식).

### B. 상호작용: 공간 분할 (Spatial Indexing)
단순한 루프(Loop) 방식의 히트 테스트는 객체가 많아지면 CPU 병목(랙)을 유발합니다.

*   **솔루션**: **Quadtree (쿼드트리)** 도입
    *   화면을 격자로 나누어 객체 위치를 인덱싱.
    *   마우스 주변의 소수 객체만 검사하므로, 객체가 10만 개가 되어도 **O(log N)** 속도로 즉시 선택 가능.

---

## 3. 기능 구현 로드맵 (Features)

### [Phase 1] 데이터 구조 개편 (Data Model)
단순 좌표 배열을 **객체(Object)** 형태로 격상시켜야 합니다.
```typescript
interface WhiteboardObject {
    id: string;          // 고유 ID (UUID)
    type: 'stroke' | 'image' | 'text';
    data: Point[] | string; // 좌표 또는 이미지 URL
    transform: {         // 변환 매트릭스
        x: number;
        y: number;
        rotation: number;
        scale: number;
    };
    zIndex: number;      // 레이어 순서
}
```

### [Phase 2] 이미지 및 미리보기 (Image & Preview)
기존 구조에서 가장 빠르게 도입 가능한 기능입니다.
*   **이미지 삽입**: `PIXI.Sprite.from(url)`을 사용하여 렌더링.
*   **미리보기(Ghost)**: 확정 전까지 `Overlay Container` (임시 레이어)에서 마우스를 따라다니게 구현. 로컬 전용이므로 네트워크 부하 없음.

### [Phase 3] 객체 조작 (Manipulation)
벡터 방식 전환 후 구현합니다.
*   **Select**: Quadtree를 이용해 클릭한 위치의 `id` 식별.
*   **Transform Gizmo**: 선택된 객체 주변에 핸들(크기 조절/회전 점) UI 표시.
*   **Move**: 선택된 객체의 `transform.x, y` 값만 변경 후 재전송 (전체 다시 그리기 X).

### [Phase 4] 추가 제안 기능 (Proposed Features)
*   **Minimap (미니맵)**: 캔버스가 넓어질 때 현재 위치를 파악할 수 있는 네비게이터. (Baking된 텍스처 축소판 활용)
*   **Laser Pointer (레이저 포인터)**: 그리는 것이 아니라, 일시적으로 궤적만 보여주고 사라지는 발표용 도구.
*   **Infinite Undo/Redo (무한 실행 취소)**: 벡터 데이터 기반이므로 메모리만 허용하면 무제한 히스토리 관리 가능.
*   **Export to PDF/SVG**: 벡터 원본 데이터를 활용해 고해상도 PDF/SVG 내보내기 기능.
*   **Smart Shape Assist**: 원, 사각형 등을 대충 그려도 깔끔하게 보정해주는 기능 (기존 Shape Recognition 강화).

---

## 4. 네트워크 및 저장소 (Network & DB)

*   **통신 (LiveKit vs Socket.io)**:
    *   현재 LiveKit 구조로도 충분함. (단순 데이터 파이프 역할)
    *   객체가 개별화되면 "전체 캔버스 전송"이 아니라 **"변경된 객체 ID와 속성(Delta)"만 전송**하게 되어 더 효율적임.

*   **DB (PostgreSQL)**:
    *   기존 `whiteboard_strokes` 테이블에 `transform`이나 `group_id` 같은 메타데이터 필드를 JSON 내부에 추가하여 확장 가능.

---

## 5. 결론 및 추천

1.  **단기**: 이미지 삽입 기능은 현 구조에서도 '스탬프' 방식으로 즉시 구현 가능하므로 먼저 진행 추천.
2.  **장기**: "객체 선택/이동"은 **Hybrid Rendering + Quadtree** 구조로 리팩토링 후 진행해야 성능 이슈 없이 상용 수준의 퀄리티를 낼 수 있음.
