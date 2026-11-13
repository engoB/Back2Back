// One-button input: touch / mouse / keyboard / gamepad all map to "action".
export class Input {
  constructor(target) {
    this.held = false;
    this._pressed = false;
    this.enabled = true;
    this.pointerId = null;
    this.keys = new Set();
    this.onAny = null; // first user gesture hook (audio unlock)
    this.onPause = null;
    this.padHeld = false;

    const down = (e) => {
      if (this.onAny) this.onAny();
      if (!this.enabled) return;
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, .ui-block')) return;
      if (e.cancelable) e.preventDefault();
      this.pointerId = e.pointerId;
      this._down();
    };
    const up = (e) => {
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this._up();
    };
    target.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', () => { this.keys.clear(); this._up(); });
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (this.onAny) this.onAny();
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.onPause && !e.repeat) this.onPause();
        return;
      }
      if (['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'Enter', 'KeyX'].includes(e.code)) {
        if (!this.enabled) return;
        e.preventDefault();
        if (e.repeat) return;
        this.keys.add(e.code);
        this._down();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (this.keys.delete(e.code) && this.keys.size === 0 && this.pointerId === null) this._up();
    });
  }

  _down() {
    if (!this.held) this._pressed = true;
    this.held = true;
  }
  _up() {
    if (this.keys.size > 0 || this.padHeld) return;
    this.held = false;
  }

  /** Poll gamepads (call once per frame). */
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let any = false, start = false;
    for (const p of pads) {
      if (!p) continue;
      if (p.buttons[0]?.pressed || p.buttons[1]?.pressed || p.buttons[2]?.pressed) any = true;
      if (p.buttons[9]?.pressed) start = true;
    }
    if (any && !this.padHeld) {
      this.padHeld = true;
      if (this.onAny) this.onAny();
      if (this.enabled) this._down();
    } else if (!any && this.padHeld) {
      this.padHeld = false;
      if (this.pointerId === null) this._up();
    }
    if (start && !this._startHeld && this.onPause) this.onPause();
    this._startHeld = start;
  }

  /** Returns true once per tap. */
  consumePress() {
    const p = this._pressed;
    this._pressed = false;
    return p;
  }
  reset() {
    this.held = false;
    this._pressed = false;
    this.pointerId = null;
    this.keys.clear();
  }
}
