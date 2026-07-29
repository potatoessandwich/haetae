// 해부실 사운드 — 외부 음원 없이 Web Audio API로 즉석 생성한 효과음.
// 비명/포효 같은 직접적 공포 효과 대신 낮은 기계음/마찰음/충격음만 사용한다.

const STORAGE_KEY = "haetae-exhibit-muted";

class ExhibitSound {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(STORAGE_KEY) === "1";
    this.hum = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(v) {
    this.muted = v;
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    if (this.hum) this.hum.gain.gain.setTargetAtTime(v ? 0 : this.hum.baseGain, this.ctx.currentTime, 0.2);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _noiseBuffer(duration) {
    const ctx = this.ensureCtx();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // 낮은 기계 진동음 — 배경에 은은하게 루프
  startHum() {
    if (this.hum || this.muted) return;
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 42;
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 63;
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.02;
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2.start();
    this.hum = { osc, osc2, gain, baseGain: 0.02 };
  }

  // 돌을 긁는 마찰음
  scrape(duration = 0.9) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  // 절개 실행 시 짧고 무거운 충격음
  thud() {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  // 돌가루가 떨어지는 소리
  dust(duration = 0.5) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }
}

export const sound = new ExhibitSound();

export function mountMuteButton(container) {
  const btn = document.createElement("button");
  btn.className = "btn btn-ghost btn-icon mute-btn";
  btn.type = "button";
  const render = () => {
    btn.textContent = sound.isMuted() ? "🔇 MUTE" : "🔊 SOUND";
    btn.setAttribute("aria-pressed", String(sound.isMuted()));
  };
  render();
  btn.addEventListener("click", () => {
    sound.toggleMuted();
    render();
  });
  (container || document.body).appendChild(btn);
  return btn;
}
