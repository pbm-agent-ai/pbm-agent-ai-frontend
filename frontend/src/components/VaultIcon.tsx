import { useRef, useEffect } from 'react';

// Props
interface VaultIconProps {
  className?: string;
  crying?: boolean;
  mouth?: 'auto' | 'smile' | 'open' | 'wavy';
  animated?: boolean;
  followMouse?: boolean;
  resetEyes?: boolean;
  analyzing?: boolean;
  dizzy?: boolean;
}

export function VaultIcon({
  className = 'w-[28px] h-[28px]',
  crying,
  mouth,
  animated = true,
  followMouse,
  resetEyes,
  analyzing,
  dizzy,
}: VaultIconProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyeLeftRef = useRef<SVGGElement>(null);
  const eyeRightRef = useRef<SVGGElement>(null);
  const currentOffset = useRef({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });
  const isSmallSize =
    !className.includes('w-10') &&
    !className.includes('w-12') &&
    !className.includes('w-20');

  useEffect(() => {
    if (!followMouse) return;
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetOffset.current = {
        x: Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2)),
      };
    };
    const animate = () => {
      currentOffset.current.x += (targetOffset.current.x - currentOffset.current.x) * 0.25;
      currentOffset.current.y += (targetOffset.current.y - currentOffset.current.y) * 0.25;
      const { x, y } = currentOffset.current;
      if (eyeLeftRef.current) eyeLeftRef.current.setAttribute('transform', `translate(${11 + x}, ${13 + y})`);
      if (eyeRightRef.current) eyeRightRef.current.setAttribute('transform', `translate(${21 + x}, ${13 + y})`);
      rafId = requestAnimationFrame(animate);
    };
    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [followMouse]);

  useEffect(() => {
    if (!resetEyes) return;
    currentOffset.current = { x: 0, y: 0 };
    targetOffset.current = { x: 0, y: 0 };
    if (eyeLeftRef.current) eyeLeftRef.current.setAttribute('transform', 'translate(11, 13)');
    if (eyeRightRef.current) eyeRightRef.current.setAttribute('transform', 'translate(21, 13)');
  }, [resetEyes]);

  const isHappy = mouth === 'smile';

  return (
    <svg ref={svgRef} viewBox="0 0 32 30" className={className} fill="none">
      <g>
        {/* Main Body Wobble on crying/dizzy */}
        {crying && (
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -0.8; 0 0; 0 0.5; 0 0; 0 -0.3; 0 0" dur="2s" repeatCount="indefinite" />
        )}
        {dizzy && (
          <animateTransform attributeName="transform" type="rotate" values="-3 16 18; 3 16 18; -3 16 18" dur="0.4s" repeatCount="indefinite" />
        )}

        {/* --- Vault Body Outer --- */}
        <rect x="2" y="6" width="28" height="22" rx="4" fill="#7BAEDA" opacity="0.8" /> {/* Bottom shadow/ledge */}
        <rect x="2" y="6" width="28" height="20" rx="4" fill="#DBE2EF" />
        
        {/* Feet */}
        <rect x="5" y="26" width="4" height="2" rx="1" fill="#0F3460" />
        <rect x="23" y="26" width="4" height="2" rx="1" fill="#0F3460" />

        {/* --- The Vault Door Group --- */}
        <g>
          {!isSmallSize && (
            <>
              {/* Door Base */}
              <rect x="4" y="8" width="24" height="17" rx="2" fill="#DBE2EF" />
              {/* Hinges */}
              <rect x="3.5" y="10" width="1" height="3" fill="#0F3460" />
              <rect x="3.5" y="21" width="1" height="3" fill="#0F3460" />
            </>
          )}

          {/* --- Screen --- */}
          <rect x="6" y="10" width="20" height="11" rx="2" fill="#0F3460" />

          {!isSmallSize && (
            <rect x="6" y="10" width="20" height="11" rx="2" fill="#F59E0B" style={{ opacity: isHappy ? 0.2 : 0, transition: 'opacity 0.3s' }}>
              {!analyzing && !crying && !isHappy && !dizzy && (
                <animate attributeName="opacity" values="0.02; 0.08; 0.02" dur="3s" repeatCount="indefinite" />
              )}
            </rect>
          )}

          {/* --- Eyes --- */}
          {dizzy ? (
            <>
              <g transform="translate(11, 15)">
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1s" repeatCount="indefinite" />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="4" fontWeight="bold" fill="#7BAEDA" fontFamily="sans-serif" style={{ userSelect: 'none' }}>@</text>
                </g>
              </g>
              <g transform="translate(21, 15)">
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1s" repeatCount="indefinite" />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="4" fontWeight="bold" fill="#7BAEDA" fontFamily="sans-serif" style={{ userSelect: 'none' }}>@</text>
                </g>
              </g>
            </>
          ) : (
            <>
              <g ref={eyeLeftRef} transform="translate(11, 13)">
                {isHappy ? (
                  <path d="M-2 0.5 Q0 -2 2 0.5" stroke="#7BAEDA" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                ) : crying ? (
                  <path d="M-2.5 0 Q0 -1.5 2.5 0" stroke="#7BAEDA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                ) : (
                  <rect x="-2" y="-2" width="4" height="4" rx="1.5" fill="#7BAEDA">
                    {animated && !analyzing && <animateTransform attributeName="transform" type="scale" values="1 1; 1 1; 1.5 0.2; 1.5 0.2; 1 1" keyTimes="0; 0.85; 0.92; 0.96; 1" dur="3.5s" repeatCount="indefinite" additive="sum" />}
                    {analyzing && <animateTransform attributeName="transform" type="translate" values="0 0; -1.5 0; 1.5 0; 0 0" keyTimes="0; 0.25; 0.75; 1" dur="1s" repeatCount="indefinite" />}
                  </rect>
                )}
              </g>
              <g ref={eyeRightRef} transform="translate(21, 13)">
                {isHappy ? (
                  <path d="M-2 0.5 Q0 -2 2 0.5" stroke="#7BAEDA" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                ) : crying ? (
                  <path d="M-2.5 0 Q0 -1.5 2.5 0" stroke="#7BAEDA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                ) : (
                  <rect x="-2" y="-2" width="4" height="4" rx="1.5" fill="#7BAEDA">
                    {animated && !analyzing && <animateTransform attributeName="transform" type="scale" values="1 1; 1 1; 1.5 0.2; 1.5 0.2; 1 1" keyTimes="0; 0.85; 0.92; 0.96; 1" dur="3.5s" repeatCount="indefinite" additive="sum" />}
                    {analyzing && <animateTransform attributeName="transform" type="translate" values="0 0; -1.5 0; 1.5 0; 0 0" keyTimes="0; 0.25; 0.75; 1" dur="1s" repeatCount="indefinite" />}
                  </rect>
                )}
              </g>
            </>
          )}

          {/* --- Mouth --- */}
          {(dizzy || mouth === 'wavy') ? (
            <path d="M13 19 Q14.5 17.5 16 19 T19 19" stroke="#7BAEDA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : mouth === 'smile' ? (
            <path d="M14 18.5 Q16 20.5 18 18.5" stroke="#7BAEDA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : mouth === 'open' ? (
            <rect x="14.5" y="18.5" width="3" height="2" rx="0.8" fill="#7BAEDA" />
          ) : crying ? (
            <path d="M13 19.5 Q16 18 19 19.5" stroke="#7BAEDA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : (
            <rect x="14.5" y="18.5" width="3" height="1.5" rx="0.6" fill="#7BAEDA" opacity="0.8" />
          )}

          {!isSmallSize && (
            <g transform="translate(16, 26)">
              <g>
                {analyzing && <animateTransform attributeName="transform" type="rotate" values="-35 0 0; 35 0 0; -35 0 0" keyTimes="0; 0.5; 1" dur="1.5s" repeatCount="indefinite" />}
                {/* Outer dial ring */}
                <circle cx="0" cy="0" r="2.5" fill="#7BAEDA" />
                {/* Inner dial */}
                <circle cx="0" cy="0" r="1.8" fill="#DBE2EF" />
                {/* Ticks */}
                <path d="M0 -2.5 L 0 -1.8 M0 2.5 L 0 1.8 M-2.5 0 L -1.8 0 M2.5 0 L 1.8 0" stroke="#1E4D8C" strokeWidth="0.4" />
                {/* Indicator notch */}
                <circle cx="0" cy="-1" r="0.4" fill="#F59E0B" />
                {/* Center point */}
                <circle cx="0" cy="0" r="0.6" fill="#1E4D8C" />
              </g>
            </g>
          )}

        </g>

        {/* --- Tears (if crying) --- */}
        {!isSmallSize && crying && (
          <g>
            <circle cx="11" cy="18" r="1.2" fill="#7BAEDA">
              <animate attributeName="cy" values="18; 18; 26" dur="1.5s" repeatCount="indefinite" keyTimes="0; 0.3; 1" />
              <animate attributeName="opacity" values="0; 0; 0.8; 0" dur="1.5s" repeatCount="indefinite" keyTimes="0; 0.3; 0.7; 1" />
            </circle>
            <circle cx="21" cy="18" r="1.2" fill="#7BAEDA">
              <animate attributeName="cy" values="18; 18; 26" dur="1.5s" repeatCount="indefinite" keyTimes="0; 0.3; 1" begin="0.3s" />
              <animate attributeName="opacity" values="0; 0; 0.8; 0" dur="1.5s" repeatCount="indefinite" keyTimes="0; 0.3; 0.7; 1" begin="0.3s" />
            </circle>
          </g>
        )}
      </g>
    </svg>
  );
}
