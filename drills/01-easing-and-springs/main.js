import { animate } from 'motion';
import { reducedMotion } from '../../shared/page.js';

const CURVES = {
  linear: 'linear',
  'ease-in': 'cubic-bezier(0.55, 0, 1, 0.45)',
  'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
};

const lanes = [...document.querySelectorAll('.lane')].map((lane) => ({
  kind: lane.dataset.kind,
  dot: lane.querySelector('.dot'),
  track: lane.querySelector('.track'),
  anim: null,
}));

const dur = document.getElementById('dur');
const bounce = document.getElementById('bounce');
let atEnd = false;

const currentX = (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
const endX = (lane) => lane.track.clientWidth - lane.dot.offsetWidth;

function play() {
  atEnd = !atEnd;
  const ms = reducedMotion() ? 1 : Number(dur.value);
  for (const lane of lanes) {
    const to = atEnd ? endX(lane) : 0;
    if (lane.kind === 'spring') {
      // Motion keeps the running animation's velocity when it is retargeted.
      lane.anim = animate(lane.dot, { x: to }, { type: 'spring', visualDuration: ms / 1000, bounce: Number(bounce.value) });
    } else {
      // A fresh keyframe animation always starts at zero velocity: this is the jerk you see on interrupt.
      const from = currentX(lane.dot);
      lane.anim?.cancel();
      lane.dot.style.transform = `translateX(${from}px)`;
      lane.anim = lane.dot.animate(
        [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
        { duration: ms, easing: CURVES[lane.kind], fill: 'forwards' },
      );
    }
  }
}

document.getElementById('play').addEventListener('click', play);
dur.addEventListener('input', () => {
  document.getElementById('dur-out').value = dur.value;
  document.getElementById('dur-note').textContent = `${dur.value} ms`;
});
bounce.addEventListener('input', () => (document.getElementById('bounce-out').value = bounce.value));

// Keep finished dots pinned to the right edge when the layout width changes.
addEventListener('resize', () => {
  if (!atEnd) return;
  for (const lane of lanes) {
    lane.anim?.cancel?.();
    lane.anim?.stop?.();
    lane.dot.style.transform = `translateX(${endX(lane)}px)`;
  }
});
