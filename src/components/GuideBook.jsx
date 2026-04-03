import React, { useState, useRef, useCallback, useEffect } from 'react';

/*
  Pages layout (spread view):
    Spread 0: page1 (left), page2 (right)
    Spread 1: page3 (left), page4 (right)
    Spread 2: page5 (left), page6 (right)

  When turning forward from spread 0→1:
    The right page (page2) lifts and flips left, revealing page3 on its back.
    Once settled, spread 1 shows page3 (left) + page4 (right).

  When turning backward from spread 1→0:
    The left page (page3) lifts and flips right, revealing page2 on its back.
*/

const PAGES = [
  './assest/book/sayfa1.png',
  './assest/book/sayfa2.png',
  './assest/book/sayfa3.png',
  './assest/book/sayfa4.png',
  './assest/book/sayfa5.png',
  './assest/book/sayfa6.png',
];

const TOTAL_SPREADS = 3; // 6 pages / 2

export default function GuideBook({ onClose }) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState(null); // 'forward' | 'backward'
  const [flipProgress, setFlipProgress] = useState(0); // 0..1
  const [dragging, setDragging] = useState(false);
  const [mouseY, setMouseY] = useState(0.5); // 0..1, represents vertical position
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const bookRef = useRef(null);
  const animFrame = useRef(null);

  // Preload all images when component mounts
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = PAGES.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });
      });
      
      try {
        await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Continue anyway
      }
    };
    
    preloadImages();
  }, []);

  const leftPage = currentSpread * 2;
  const rightPage = currentSpread * 2 + 1;

  const startDrag = useCallback((e) => {
    if (flipping) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const isRightHalf = relX > rect.width / 2;

    // Right half → forward, Left half → backward
    if (isRightHalf && currentSpread >= TOTAL_SPREADS - 1) return;
    if (!isRightHalf && currentSpread <= 0) return;

    setDragging(true);
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    setMouseY(relY / rect.height); // Normalize 0..1
    setFlipDirection(isRightHalf ? 'forward' : 'backward');
    setFlipProgress(0);
  }, [flipping, currentSpread]);

  const moveDrag = useCallback((e) => {
    if (!dragging || !flipDirection) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;

    const halfW = rect.width / 2;
    const dx = clientX - dragStartX.current;
    const dy = clientY - dragStartY.current;

    let progress;
    if (flipDirection === 'forward') {
      // Drag left → progress increases
      progress = Math.min(1, Math.max(0, -dx / halfW));
    } else {
      // Drag right → progress increases
      progress = Math.min(1, Math.max(0, dx / halfW));
    }
    setFlipProgress(progress);

    // Update mouseY for vertical curl effect
    const currentY = clientY - rect.top;
    setMouseY(Math.min(1, Math.max(0, currentY / rect.height)));
  }, [dragging, flipDirection]);

  const endDrag = useCallback(() => {
    if (!dragging || !flipDirection) return;
    setDragging(false);

    const threshold = 0.4;
    if (flipProgress > threshold) {
      // Complete the flip
      setFlipping(true);
      animateFlip(flipProgress, 1, () => {
        if (flipDirection === 'forward') {
          setCurrentSpread(prev => Math.min(TOTAL_SPREADS - 1, prev + 1));
        } else {
          setCurrentSpread(prev => Math.max(0, prev - 1));
        }
        setFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
        setMouseY(0.5);
      });
    } else {
      // Cancel — return to 0 smoothly
      setFlipping(true);
      animateFlip(flipProgress, 0, () => {
        setFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
        setMouseY(0.5);
      });
    }
  }, [dragging, flipDirection, flipProgress]);

  const animateFlip = (from, to, onDone) => {
    const duration = to === 0 ? 250 : 400; // Faster cancel animation
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic for smooth finish
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      setFlipProgress(value);
      if (t < 1) {
        animFrame.current = requestAnimationFrame(animate);
      } else {
        onDone();
      }
    };
    if (animFrame.current) {
      cancelAnimationFrame(animFrame.current);
    }
    animFrame.current = requestAnimationFrame(animate);
  };

  // Double-click / tap to flip
  const handleQuickFlip = useCallback((e) => {
    if (flipping || dragging) return;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const isRightHalf = relX > rect.width / 2;

    setMouseY(relY / rect.height);

    if (isRightHalf && currentSpread < TOTAL_SPREADS - 1) {
      setFlipDirection('forward');
      setFlipping(true);
      animateFlip(0, 1, () => {
        setCurrentSpread(prev => prev + 1);
        setFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
        setMouseY(0.5);
      });
    } else if (!isRightHalf && currentSpread > 0) {
      setFlipDirection('backward');
      setFlipping(true);
      animateFlip(0, 1, () => {
        setCurrentSpread(prev => prev - 1);
        setFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
        setMouseY(0.5);
      });
    }
  }, [flipping, dragging, currentSpread]);

  useEffect(() => {
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  // Touch events
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    const onTouchStart = (e) => startDrag(e);
    const onTouchMove = (e) => { e.preventDefault(); moveDrag(e); };
    const onTouchEnd = () => endDrag();
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [startDrag, moveDrag, endDrag]);

  // Angle from progress: 0 → 0deg, 1 → 180deg
  const flipAngle = flipProgress * 180;

  // Calculate curl effect based on mouse position
  // mouseY: 0 (top) to 1 (bottom)
  // Create a subtle vertical curl when flipping
  const curlAmount = (mouseY - 0.5) * 30; // -15deg to +15deg
  const curlIntensity = Math.sin(flipProgress * Math.PI); // Peak at middle of flip
  const verticalCurl = curlAmount * curlIntensity;

  // Add slight vertical translation for more organic feel
  const verticalShift = (mouseY - 0.5) * 40 * Math.sin(flipProgress * Math.PI);

  // Determine which pages are involved in the flip
  // Forward: right page flips left, front=rightPage, back=next leftPage
  // Backward: left page flips right, front=leftPage, back=prev rightPage
  const getFlipPages = () => {
    if (flipDirection === 'forward') {
      const front = PAGES[rightPage]; // page showing initially (right)
      const back = PAGES[rightPage + 1]; // page behind it (next left)
      return { front, back };
    } else if (flipDirection === 'backward') {
      const front = PAGES[leftPage]; // page showing initially (left)
      const back = PAGES[leftPage - 1]; // page behind it (prev right)
      return { front, back };
    }
    return { front: null, back: null };
  };

  // flipDirection set edildiği anda flip elementi render edilmeli;
  // flipProgress > 0 koşulu ilk frame'de arka yüzün hazır olmamasına neden oluyordu
  const isFlipping = flipDirection !== null;
  const { front: flipFront, back: flipBack } = getFlipPages();

  // Shadow intensities based on flip progress
  const shadowIntensity = Math.sin(flipProgress * Math.PI) * 0.5;

  return (
    <div className="guidebook-overlay" onClick={onClose}>
      <div className="guidebook-container" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="guidebook-close" onClick={onClose}>✕</button>

        {/* Page indicator */}
        <div className="guidebook-indicator">
          {[0, 1, 2].map(i => (
            <div key={i} className={`guidebook-dot ${i === currentSpread ? 'guidebook-dot--active' : ''}`} />
          ))}
        </div>

        {/* Book */}
        <div
          className="guidebook-book"
          ref={bookRef}
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={() => dragging && endDrag()}
          onClick={!dragging && flipProgress < 0.05 ? handleQuickFlip : undefined}
        >
          {/* Background — the open book cover */}
          <img src="./assest/book/backopen.png" alt="" className="guidebook-bg" draggable={false} />

          {/* Left page (static when not flipping backward) */}
          <div 
            className="guidebook-page guidebook-page--left"
            style={{ zIndex: isFlipping && flipDirection === 'backward' ? 0 : 2 }}
          >
            {(!isFlipping || flipDirection !== 'backward') && (
              <>
                <img src={PAGES[leftPage]} alt={`Sayfa ${leftPage + 1}`} draggable={false} />
                {/* Shadow when right page is flipping */}
                {isFlipping && flipDirection === 'forward' && (
                  <div 
                    className="guidebook-page__ambient-shadow"
                    style={{ opacity: shadowIntensity * 0.4 }}
                  />
                )}
              </>
            )}
            {/* When flipping backward, show the target left page immediately */}
            {isFlipping && flipDirection === 'backward' && (
              <img src={PAGES[leftPage - 2] || PAGES[0]} alt="" draggable={false} />
            )}
          </div>

          {/* Right page (static when not flipping forward) */}
          <div 
            className="guidebook-page guidebook-page--right"
            style={{ zIndex: isFlipping && flipDirection === 'forward' ? 0 : 2 }}
          >
            {(!isFlipping || flipDirection !== 'forward') && (
              <>
                <img src={PAGES[rightPage]} alt={`Sayfa ${rightPage + 1}`} draggable={false} />
                {/* Shadow when left page is flipping */}
                {isFlipping && flipDirection === 'backward' && (
                  <div 
                    className="guidebook-page__ambient-shadow guidebook-page__ambient-shadow--right"
                    style={{ opacity: shadowIntensity * 0.4 }}
                  />
                )}
              </>
            )}
            {/* When flipping forward, show the target right page immediately */}
            {isFlipping && flipDirection === 'forward' && (
              <img src={PAGES[rightPage + 2] || PAGES[5]} alt="" draggable={false} />
            )}
          </div>

          {/* The flipping page */}
          {isFlipping && (
            <div
              className={`guidebook-flip ${flipDirection === 'forward' ? 'guidebook-flip--forward' : 'guidebook-flip--backward'}`}
              style={{
                transform: flipDirection === 'forward'
                  ? `rotateY(${-flipAngle}deg) rotateX(${verticalCurl}deg) translateY(${verticalShift}px)`
                  : `rotateY(${flipAngle}deg) rotateX(${-verticalCurl}deg) translateY(${verticalShift}px)`,
                zIndex: 10, // Always on top during flip
              }}
            >
              {/* Front of flipping page */}
              <div className="guidebook-flip__front">
                <img src={flipFront} alt="" draggable={false} />
                {/* Multiple shadow layers for depth */}
                <div
                  className="guidebook-flip__shadow-front"
                  style={{ opacity: shadowIntensity }}
                />
                <div
                  className="guidebook-flip__shadow-gradient"
                  style={{ opacity: shadowIntensity * 0.6 }}
                />
                <div
                  className="guidebook-flip__edge-shadow"
                  style={{ opacity: shadowIntensity * 0.8 }}
                />
                {/* Highlight on the curl edge */}
                <div
                  className="guidebook-flip__highlight"
                  style={{ opacity: shadowIntensity * 0.3 }}
                />
                {/* Page thickness effect */}
                <div
                  className="guidebook-flip__thickness"
                  style={{ opacity: Math.min(1, shadowIntensity * 1.2) }}
                />
              </div>
              {/* Back of flipping page */}
              <div className="guidebook-flip__back">
                <img src={flipBack} alt="" draggable={false} />
                <div
                  className="guidebook-flip__shadow-back"
                  style={{ opacity: shadowIntensity }}
                />
                <div
                  className="guidebook-flip__shadow-gradient guidebook-flip__shadow-gradient--back"
                  style={{ opacity: shadowIntensity * 0.6 }}
                />
                <div
                  className="guidebook-flip__edge-shadow guidebook-flip__edge-shadow--back"
                  style={{ opacity: shadowIntensity * 0.8 }}
                />
                {/* Page thickness effect on back */}
                <div
                  className="guidebook-flip__thickness guidebook-flip__thickness--back"
                  style={{ opacity: Math.min(1, shadowIntensity * 1.2) }}
                />
              </div>
            </div>
          )}

          {/* Fold shadow on spine */}
          {isFlipping && (
            <div
              className="guidebook-spine-shadow"
              style={{ opacity: shadowIntensity * 0.6 }}
            />
          )}
        </div>

        {/* Navigation hints */}
        <div className="guidebook-nav">
          {currentSpread > 0 && !isFlipping && (
            <div className="guidebook-nav__hint guidebook-nav__hint--left">‹ Önceki</div>
          )}
          {currentSpread < TOTAL_SPREADS - 1 && !isFlipping && (
            <div className="guidebook-nav__hint guidebook-nav__hint--right">Sonraki ›</div>
          )}
        </div>
      </div>
    </div>
  );
}
