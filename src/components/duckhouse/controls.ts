import type { StationKey } from './stations';

/**
 * Mutable input state shared between the DOM overlay and the 3D frame loop.
 * Kept outside React state so per-frame reads never trigger re-renders.
 */
export type MoveDir = 'up' | 'down' | 'left' | 'right';

/**
 * Mutable input state shared between the DOM overlay and the 3D frame loop.
 * Kept outside React state so per-frame reads never trigger re-renders.
 */
export const input = {
  keys: new Set<string>(),
  dirs: new Set<MoveDir>(),
  /** Timestamp ghi nhận lần gần nhất nhận keydown cho từng hướng */
  lastDown: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  } as Record<MoveDir, number>,
  /** Cờ giữ phím bởi chuột / pointer trên giao diện */
  pointerHeld: {
    up: false,
    down: false,
    left: false,
    right: false,
  } as Record<MoveDir, number | boolean>,
  joyX: 0,
  joyY: 0,
  /** performance.now()/1000 of the last quack (drives jump animation) */
  quackAt: -10,
  /** Timestamp lần tương tác cuối cùng (dùng để phát hiện idle khi ngủ đêm) */
  lastInteractAt: performance.now(),
  notifyInteract() {
    this.lastInteractAt = performance.now();
  },

  onKeyDown(dir: MoveDir, code?: string, key?: string) {
    const now = performance.now();
    this.lastInteractAt = now;
    this.lastDown[dir] = now;
    this.dirs.add(dir);

    // 1. Phím đối diện (up <-> down, left <-> right) luôn luôn ngắt lẫn nhau tức thì:
    if (dir === 'up') {
      this.dirs.delete('down');
      this.keys.delete('KeyS');
      this.keys.delete('ArrowDown');
    } else if (dir === 'down') {
      this.dirs.delete('up');
      this.keys.delete('KeyW');
      this.keys.delete('ArrowUp');
    } else if (dir === 'left') {
      this.dirs.delete('right');
      this.keys.delete('KeyD');
      this.keys.delete('ArrowRight');
    } else if (dir === 'right') {
      this.dirs.delete('left');
      this.keys.delete('KeyA');
      this.keys.delete('ArrowLeft');
    }

    // 2. Tự động xoá hướng vuông góc CŨ đã qua (>180ms trước):
    // Ví dụ: Bạn vừa đi sang trái (A), thả tay rồi bấm tiến lên (W).
    // Nếu hướng A đã nhấn hơn 180ms trước mà Unikey nuốt mất keyup của A,
    // thì A là hướng cũ -> lập tức xoá A để khi bấm W vịt đi THẲNG TẮP 100%, không bị chéo!
    const STALE_CHORD_MS = 180;
    if (dir === 'up' || dir === 'down') {
      if (this.dirs.has('left') && !this.pointerHeld.left && now - this.lastDown.left > STALE_CHORD_MS) {
        this.dirs.delete('left');
        this.keys.delete('KeyA');
        this.keys.delete('ArrowLeft');
      }
      if (this.dirs.has('right') && !this.pointerHeld.right && now - this.lastDown.right > STALE_CHORD_MS) {
        this.dirs.delete('right');
        this.keys.delete('KeyD');
        this.keys.delete('ArrowRight');
      }
    } else if (dir === 'left' || dir === 'right') {
      if (this.dirs.has('up') && !this.pointerHeld.up && now - this.lastDown.up > STALE_CHORD_MS) {
        this.dirs.delete('up');
        this.keys.delete('KeyW');
        this.keys.delete('ArrowUp');
      }
      if (this.dirs.has('down') && !this.pointerHeld.down && now - this.lastDown.down > STALE_CHORD_MS) {
        this.dirs.delete('down');
        this.keys.delete('KeyS');
        this.keys.delete('ArrowDown');
      }
    }

    // 3. Xử lý đặc thù bộ gõ Telex khi Unikey chủ động xoá phím trước:
    // Khi gõ A rồi W tạo thành 'ă' -> Unikey đã xoá chữ A -> giải phóng 'left' ngay lập tức!
    if (key === 'ă') {
      this.dirs.delete('left');
      this.keys.delete('KeyA');
      this.keys.delete('ArrowLeft');
    }
    // Khi gõ A rồi S tạo thành 'á' -> Unikey đã xoá chữ A -> giải phóng 'left' ngay lập tức!
    if (key === 'á' || key === 'ắ' || key === 'ấ') {
      this.dirs.delete('left');
      this.keys.delete('KeyA');
      this.keys.delete('ArrowLeft');
    }
    // Khi gõ W rồi S tạo thành 'ứ' -> Unikey đã xoá chữ W -> giải phóng 'up' ngay lập tức!
    if (key === 'ứ') {
      this.dirs.delete('up');
      this.keys.delete('KeyW');
      this.keys.delete('ArrowUp');
    }

    if (dir === 'up') this.keys.add('KeyW');
    if (dir === 'down') this.keys.add('KeyS');
    if (dir === 'left') this.keys.add('KeyA');
    if (dir === 'right') this.keys.add('KeyD');
    if (code) this.keys.add(code);
  },

  onKeyUp(dir: MoveDir, code?: string) {
    this.dirs.delete(dir);
    if (dir === 'up') {
      this.keys.delete('KeyW');
      this.keys.delete('ArrowUp');
    }
    if (dir === 'down') {
      this.keys.delete('KeyS');
      this.keys.delete('ArrowDown');
    }
    if (dir === 'left') {
      this.keys.delete('KeyA');
      this.keys.delete('ArrowLeft');
    }
    if (dir === 'right') {
      this.keys.delete('KeyD');
      this.keys.delete('ArrowRight');
    }
    if (code) this.keys.delete(code);
  },

  setPointerDir(dir: MoveDir, active: boolean) {
    this.pointerHeld[dir] = active;
    if (active) {
      this.lastDown[dir] = performance.now();
      this.dirs.add(dir);
    } else {
      this.dirs.delete(dir);
    }
  },

  setDir(dir: MoveDir, active: boolean) {
    if (active) {
      this.onKeyDown(dir);
    } else {
      this.onKeyUp(dir);
    }
  },

  /**
   * Tự động quét và giải phóng phím bị kẹt khi bộ gõ tiếng Việt nuốt mất sự kiện keyup.
   * Ngưỡng maxAgeMs = 1200ms vượt qua độ trễ lặp phím ban đầu của Windows (tối đa 1000ms),
   * đảm bảo giữ phím không bao giờ bị ngắt quãng giữa chừng gây khựng!
   */
  sweepStuckKeys(now = performance.now(), maxAgeMs = 1200) {
    for (const d of ['up', 'down', 'left', 'right'] as MoveDir[]) {
      if (this.dirs.has(d) && !this.pointerHeld[d]) {
        if (now - this.lastDown[d] > maxAgeMs) {
          this.onKeyUp(d);
        }
      }
    }
  },

  clear() {
    this.keys.clear();
    this.dirs.clear();
    this.pointerHeld.up = false;
    this.pointerHeld.down = false;
    this.pointerHeld.left = false;
    this.pointerHeld.right = false;
    this.joyX = 0;
    this.joyY = 0;
  },
};

export const nav: {
  target: [number, number] | null;
  pending: StationKey | null;
  teleport: [number, number] | null;
} = {
  target: null,
  pending: null,
  teleport: null,
};

export const MOVE_KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
  'ư', 'Ư', 'đ', 'Đ',
];

/**
 * Ánh xạ sự kiện bàn phím sang hướng chuẩn hóa.
 * Đặc trị bộ gõ tiếng Việt Telex:
 * - Khi gõ A rồi gõ S: Telex sinh ra 'á' (dấu sắc). Phím vừa nhấn là S -> hướng DOWN tức thì!
 * - Khi gõ W rồi gõ S: Telex sinh ra 'ứ' (dấu sắc). Phím vừa nhấn là S -> hướng DOWN tức thì!
 * - Khi gõ A rồi gõ W: Telex sinh ra 'ă'. Phím vừa nhấn là W -> hướng UP tức thì!
 * Nhờ vậy di chuyển không bị trễ 400ms chờ auto-repeat của hệ điều hành, triệt tiêu hoàn toàn độ khựng!
 */
export function getDirection(e: KeyboardEvent | { code?: string; key?: string }): MoveDir | null {
  const code = e.code || '';
  const key = (e.key || '').toLowerCase();

  // UP: W, ArrowUp, Numpad8, hoặc Telex 'ư' (do gõ W), 'ă' (do gõ A+W)
  if (
    code === 'KeyW' ||
    code === 'ArrowUp' ||
    code === 'Numpad8' ||
    key === 'w' ||
    key === 'ư' ||
    key === 'ă' ||
    key === 'arrowup'
  ) {
    return 'up';
  }

  // DOWN: S, ArrowDown, Numpad2, hoặc ký tự do phím S (dấu sắc) tạo ra khi gõ nhanh:
  // 'á' (A+S), 'ứ' (W+S), 'ắ' (AW+S), 'ấ' (AA+S), 'é', 'ó', 'ú', 'í', 'ý'
  if (
    code === 'KeyS' ||
    code === 'ArrowDown' ||
    code === 'Numpad2' ||
    key === 's' ||
    key === 'á' ||
    key === 'ứ' ||
    key === 'ắ' ||
    key === 'ấ' ||
    key === 'é' ||
    key === 'ó' ||
    key === 'ú' ||
    key === 'í' ||
    key === 'ý' ||
    key === 'arrowdown'
  ) {
    return 'down';
  }

  // LEFT: A, ArrowLeft, Numpad4 (CHỈ phím A đơn thuần)
  if (
    code === 'KeyA' ||
    code === 'ArrowLeft' ||
    code === 'Numpad4' ||
    key === 'a' ||
    key === 'arrowleft'
  ) {
    return 'left';
  }

  // RIGHT: D, ArrowRight, Numpad6, hoặc Telex 'đ' (do gõ D đúp)
  if (
    code === 'KeyD' ||
    code === 'ArrowRight' ||
    code === 'Numpad6' ||
    key === 'd' ||
    key === 'đ' ||
    key === 'arrowright'
  ) {
    return 'right';
  }

  return null;
}
