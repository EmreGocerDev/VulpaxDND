import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/sprite-kitty.css';

// Sprite sheets – all 80×64 per frame
const FRAME_W = 80;
const FRAME_H = 64;
const IDLE_FRAMES = 8;
const WALK_FRAMES = 12;
const HURT_FRAMES = 4;
const RUN_FRAMES = 8;
const IDLE_FPS = 6;
const WALK_FPS = 10;
const HURT_FPS = 8;
const RUN_FPS = 12;
const CAT_DISPLAY_H = 120;
const CAT_DISPLAY_W = Math.round(FRAME_W * (CAT_DISPLAY_H / FRAME_H));

const MIN_WAIT = 5000;
const MAX_WAIT = 20000;
const INTERACTION_COOLDOWN = 1000;

const getSheets = (spriteSet = '') => ({
  idle: `./assest/cat/IDLE${spriteSet}.png`,
  walk: `./assest/cat/WALK${spriteSet}.png`,
  hurt: `./assest/cat/HURT${spriteSet}.png`,
  run:  `./assest/cat/RUN${spriteSet}.png`,
});
const FRAME_COUNTS = { idle: IDLE_FRAMES, walk: WALK_FRAMES, hurt: HURT_FRAMES, run: RUN_FRAMES };
const FPS_MAP = { idle: IDLE_FPS, walk: WALK_FPS, hurt: HURT_FPS, run: RUN_FPS };

/* ── Single cat instance ── */
function SingleKitty({ name, spriteSet, startBias }) {
  const [state, setState] = useState('idle');
  const [x, setX] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [frame, setFrame] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ mx: 0, my: 0 });
  const timerRef = useRef(null);
  const walkRef = useRef(null);
  const xRef = useRef(0);
  const stateRef = useRef('idle');

  const purringRef = useRef(null);
  const angryRef = useRef(null);
  const lastInteractionRef = useRef(0);

  useEffect(() => { stateRef.current = state; }, [state]);

  const getScreenWidth = useCallback(() => window.innerWidth, []);

  // Audio
  useEffect(() => {
    purringRef.current = new Audio('./assest/cat/purring.mp3');
    purringRef.current.volume = 0.15;
    angryRef.current = new Audio('./assest/cat/angry.mp3');
    return () => { purringRef.current?.pause(); angryRef.current?.pause(); };
  }, []);

  // Init position – startBias 0‥1 pushes towards left/right half
  useEffect(() => {
    const sw = getScreenWidth();
    const maxX = sw - CAT_DISPLAY_W;
    const half = maxX / 2;
    const startX = startBias < 0.5
      ? Math.random() * half
      : half + Math.random() * half;
    setX(startX);
    xRef.current = startX;
  }, [getScreenWidth, startBias]);

  useEffect(() => { xRef.current = x; }, [x]);

  // Frame animation
  useEffect(() => {
    const totalFrames = FRAME_COUNTS[state];
    const fps = FPS_MAP[state];
    let f = 0;
    setFrame(0);
    const id = setInterval(() => { f = (f + 1) % totalFrames; setFrame(f); }, 1000 / fps);
    return () => clearInterval(id);
  }, [state]);

  const startMovement = useCallback((targetX, speed, onDone) => {
    const currentX = xRef.current;
    const goingRight = targetX > currentX;
    setFacingLeft(!goingRight);
    const distance = Math.abs(targetX - currentX);
    const totalSteps = Math.ceil(distance / speed);
    let step = 0;
    const dir = goingRight ? 1 : -1;
    clearInterval(walkRef.current);
    walkRef.current = setInterval(() => {
      step++;
      setX(prev => {
        const next = prev + dir * speed;
        xRef.current = next;
        return goingRight ? Math.min(targetX, next) : Math.max(targetX, next);
      });
      if (step >= totalSteps) { clearInterval(walkRef.current); onDone?.(); }
    }, 1000 / 60);
  }, []);

  const scheduleWalk = useCallback(() => {
    const delay = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    timerRef.current = setTimeout(() => doStartWalk(), delay);
  }, []);

  const doStartWalk = useCallback(() => {
    if (stateRef.current === 'hurt' || stateRef.current === 'run') return;
    const screenW = getScreenWidth();
    const maxX = screenW - CAT_DISPLAY_W;
    const currentX = xRef.current;
    let targetX = Math.random() * maxX;
    if (Math.abs(targetX - currentX) < 100) {
      targetX = currentX < maxX / 2 ? currentX + 200 : currentX - 200;
    }
    targetX = Math.max(0, Math.min(maxX, targetX));
    setState('walk');
    startMovement(targetX, 1.5, () => { setState('idle'); scheduleWalk(); });
  }, [getScreenWidth, startMovement, scheduleWalk]);

  useEffect(() => {
    scheduleWalk();
    return () => { clearTimeout(timerRef.current); clearInterval(walkRef.current); };
  }, [scheduleWalk]);

  const triggerRunAway = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(walkRef.current);
    setState('hurt');
    const hurtDuration = (HURT_FRAMES / HURT_FPS) * 1000;
    setTimeout(() => {
      const screenW = getScreenWidth();
      const maxX = screenW - CAT_DISPLAY_W;
      const currentX = xRef.current;
      const targetX = currentX < screenW / 2 ? maxX : 0;
      setState('run');
      startMovement(targetX, 4, () => { setState('idle'); scheduleWalk(); });
    }, hurtDuration);
  }, [getScreenWidth, startMovement, scheduleWalk]);

  const canInteract = useCallback(() => {
    const now = Date.now();
    if (now - lastInteractionRef.current < INTERACTION_COOLDOWN) return false;
    lastInteractionRef.current = now;
    return true;
  }, []);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    if (!canInteract()) return;
    const audio = purringRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [canInteract]);

  const handleMouseLeave = useCallback(() => { setHovered(false); }, []);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ mx: e.clientX, my: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    if (!canInteract()) return;
    if (purringRef.current) { purringRef.current.pause(); purringRef.current.currentTime = 0; }
    const angry = angryRef.current;
    if (angry) { angry.currentTime = 0; angry.play().catch(() => {}); }
    triggerRunAway();
  }, [canInteract, triggerRunAway]);

  const sheets = getSheets(spriteSet);
  const sheet = sheets[state];
  const totalFrames = FRAME_COUNTS[state];

  return (
    <>
      <div
        className="sprite-kitty"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          width: CAT_DISPLAY_W,
          height: CAT_DISPLAY_H,
          backgroundImage: `url(${sheet})`,
          backgroundPosition: `-${frame * CAT_DISPLAY_W}px 0`,
          backgroundSize: `${totalFrames * CAT_DISPLAY_W}px ${CAT_DISPLAY_H}px`,
          transform: facingLeft
            ? `translateX(${x}px)`
            : `translateX(${x + CAT_DISPLAY_W}px) scaleX(-1)`,
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      />
      {hovered && (
        <div
          className="kitty-name-tag"
          style={{
            left: mousePos.mx,
            top: mousePos.my,
          }}
        >
          {name}
        </div>
      )}
    </>
  );
}

/* ── Container: renders both cats ── */
export default function SpriteKitty() {
  return (
    <div className="sprite-kitty-wrap">
      <SingleKitty name="Çiçi" spriteSet="" startBias={0.25} />
      <SingleKitty name="Luna" spriteSet="2" startBias={0.75} />
    </div>
  );
}
