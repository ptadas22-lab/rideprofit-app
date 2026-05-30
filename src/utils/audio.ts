/**
 * Browser-based synthesized audio engine for RideProfit physical dashboard feedback.
 * Uses Web Audio API to create high-contrast retro sounds that don't depend on static file downloads.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (browser security policy)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playStartSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Climbing optimistic arpeggio: C4 -> E4 -> G4
      const notes = [261.63, 329.63, 392.00]; 
      
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        gain.gain.setValueAtTime(0.1, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.3);
      });
    } catch (e) {
      console.warn('Audio feedback failed to play:', e);
    }
  }

  playStopSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Uplifting double beep: G4 -> C5
      const notes = [392.00, 523.25];
      
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        
        gain.gain.setValueAtTime(0.12, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.2);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.25);
      });
    } catch (e) {
      console.warn('Audio feedback failed to play:', e);
    }
  }

  playAlertSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      // Low alert frequency
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.2);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio feedback failed to play:', e);
    }
  }

  playClickSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio feedback failed to play:', e);
    }
  }
}

export const feedbackAudio = new AudioEngine();

/**
 * Premium physical vibration feedback for on-the-road hardware mounting.
 */
export function triggerHapticFeedback(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Browsers often ignore vibration unless custom user interaction has happened.
    }
  }
}
