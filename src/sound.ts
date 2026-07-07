/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;
let buzzerOscillator: OscillatorNode | null = null;
let buzzerGain: GainNode | null = null;

export function initAudio() {
  if (typeof window !== 'undefined' && !audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', duration: number, volume = 0.1) {
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Audio playback error", e);
  }
}

export function playClickSound() {
  playTone(850, 'sine', 0.05, 0.06);
}

export function playPointSound() {
  playTone(523.25, 'triangle', 0.12, 0.1); // C5
  setTimeout(() => {
    playTone(659.25, 'triangle', 0.18, 0.1); // E5
  }, 60);
}

export function playWarningSound() {
  playTone(280, 'sawtooth', 0.35, 0.12);
}

export function playUiSwipeConfirmSound() {
  try {
    initAudio();
    if (!audioCtx) return;
    const time = audioCtx.currentTime;

    // 1. The Sweep (Swipe) effect
    const oscSwipe = audioCtx.createOscillator();
    const gainSwipe = audioCtx.createGain();
    
    oscSwipe.type = 'triangle';
    oscSwipe.frequency.setValueAtTime(220, time);
    oscSwipe.frequency.exponentialRampToValueAtTime(880, time + 0.25);
    
    gainSwipe.gain.setValueAtTime(0.01, time);
    gainSwipe.gain.linearRampToValueAtTime(0.08, time + 0.1);
    gainSwipe.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    
    oscSwipe.connect(gainSwipe);
    gainSwipe.connect(audioCtx.destination);
    oscSwipe.start(time);
    oscSwipe.stop(time + 0.3);

    // 2. The chime (Confirm) effect at the peak of the swipe
    const oscChime1 = audioCtx.createOscillator();
    const oscChime2 = audioCtx.createOscillator();
    const gainChime = audioCtx.createGain();
    
    oscChime1.type = 'sine';
    oscChime2.type = 'sine';
    
    oscChime1.frequency.setValueAtTime(880, time + 0.2); // A5
    oscChime2.frequency.setValueAtTime(1109.73, time + 0.24); // C#6
    
    gainChime.gain.setValueAtTime(0.001, time);
    gainChime.gain.setValueAtTime(0.12, time + 0.2);
    gainChime.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    oscChime1.connect(gainChime);
    oscChime2.connect(gainChime);
    gainChime.connect(audioCtx.destination);
    
    oscChime1.start(time + 0.2);
    oscChime2.start(time + 0.2);
    
    oscChime1.stop(time + 0.55);
    oscChime2.stop(time + 0.55);

  } catch (e) {
    console.error("UI Swipe Confirm sound failed", e);
  }
}

let gongAudio: HTMLAudioElement | null = null;
let gongBuffer: AudioBuffer | null = null;
let isGongLoading = false;

export async function preloadGongBuffer() {
  if (gongBuffer || isGongLoading) return;
  if (!audioCtx) {
    initAudio();
  }
  if (!audioCtx) return;
  
  isGongLoading = true;
  try {
    const response = await fetch('./gongtgr1.MP3');
    const arrayBuffer = await response.arrayBuffer();
    // Safety check in case context was lost/closed
    if (audioCtx) {
      const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
        audioCtx!.decodeAudioData(arrayBuffer, resolve, reject);
      });
      gongBuffer = decoded;
    }
  } catch (e) {
    console.warn("Failed to preload /gongtgr1.MP3 into Web Audio buffer, will use HTMLAudio fallback:", e);
  } finally {
    isGongLoading = false;
  }
}

// Automatically trigger preload on window load / initial user click
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // delay slightly to let page finish loading smoothly
    setTimeout(() => {
      preloadGongBuffer();
    }, 1000);
  });
  // Also register gesture triggers for audio context and preloading
  const gestureHandler = () => {
    initAudio();
    preloadGongBuffer();
    window.removeEventListener('click', gestureHandler);
    window.removeEventListener('touchstart', gestureHandler);
  };
  window.addEventListener('click', gestureHandler);
  window.addEventListener('touchstart', gestureHandler);
}

export function playGongSound() {
  try {
    initAudio();
    
    // Play with highly responsive Web Audio buffer if loaded
    if (audioCtx && gongBuffer) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const source = audioCtx.createBufferSource();
      source.buffer = gongBuffer;
      const gainNode = audioCtx.createGain();
      
      // Trim initial silence if present (usually minor) for instant strike timing
      const startOffset = 0.15; 
      
      gainNode.gain.setValueAtTime(0.9, audioCtx.currentTime); // Boost gain for impact
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      source.start(0, startOffset);
      return;
    }
    
    // Fallback to traditional HTMLAudioElement
    if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
      if (!gongAudio) {
        gongAudio = new Audio('./gongtgr1.MP3');
      }
      // Start from 0.15s to bypass leading silence
      gongAudio.currentTime = 0.15;
      gongAudio.play().catch(e => {
        console.warn("Audio gong file play failed, using synthesizer fallback:", e);
        playTone(150, 'triangle', 1.5, 0.25);
      });
    } else {
      playTone(150, 'triangle', 1.5, 0.25);
    }
  } catch (e) {
    console.error("Gong playback error", e);
    playTone(150, 'triangle', 1.5, 0.25);
  }
}

export function playBuzzer() {
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, audioCtx.currentTime);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(114, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.2);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 1.2);
    osc2.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.error("Buzzer play failed", e);
  }
}

export function startBuzzer() {
  try {
    initAudio();
    if (!audioCtx) return;
    if (buzzerOscillator) return;
    
    buzzerOscillator = audioCtx.createOscillator();
    buzzerGain = audioCtx.createGain();
    
    buzzerOscillator.type = 'sawtooth';
    buzzerOscillator.frequency.setValueAtTime(108, audioCtx.currentTime);
    
    buzzerGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    
    buzzerOscillator.connect(buzzerGain);
    buzzerGain.connect(audioCtx.destination);
    
    buzzerOscillator.start();
  } catch (e) {
    console.error("Failed to start continuous buzzer", e);
  }
}

export function stopBuzzer() {
  try {
    if (buzzerOscillator) {
      buzzerOscillator.stop();
      buzzerOscillator.disconnect();
      buzzerOscillator = null;
    }
    if (buzzerGain) {
      buzzerGain.disconnect();
      buzzerGain = null;
    }
  } catch (e) {
    console.error("Failed to stop continuous buzzer", e);
  }
}
