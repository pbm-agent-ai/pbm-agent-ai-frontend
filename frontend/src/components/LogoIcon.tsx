import { useRef, useEffect, type ReactNode } from 'react';

/** 접시 내부 요소 */
const DishContent = () => (
  <g transform="translate(-16, -2.5)">
    <path d="M10 2.5 C10 7, 22 7, 22 2.5 Z" fill="white" />
    <ellipse cx="16" cy="2.5" rx="6" ry="2" fill="#DBE2EF" />
    <ellipse cx="16" cy="2.8" rx="4.5" ry="1.4" fill="#1E4D8C" opacity="0.1" />
    <ellipse cx="16" cy="2.5" rx="6" ry="2" fill="none" stroke="white" strokeWidth="0.5" />
    <circle cx="16" cy="2.5" r="0.6" fill="white" />
    <line x1="16" y1="2.5" x2="16" y2="0.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
    <rect x="14.8" y="0" width="2.4" height="1.2" rx="0.4" fill="white" />
    <path d="M14.5 0 A 1.5 0.7 0 0 1 17.5 0" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0">
      <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0s" repeatCount="indefinite" />
    </path>
    <path d="M13 -0.5 A 3 1.2 0 0 1 19 -0.5" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0">
      <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
    </path>
  </g>
);

// ── 공통 SVG 요소 ──
const Antenna = ({ analyzing }: { analyzing?: boolean }) => (
  <>
    {/* 마스트 */}
    <line x1="16" y1="7" x2="16" y2="2.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    {/* 3D 위성 접시 */}
    <g transform="translate(16, 2.5)">
      <g transform="rotate(35)">
        {analyzing && (
          <animateTransform attributeName="transform" type="rotate" values="15; 55; 15" dur="3.14s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" keyTimes="0; 0.5; 1" />
        )}
        <DishContent />
      </g>
    </g>
  </>
);

const RobotBody = ({ children }: { children: ReactNode }) => (
  <>
    <defs>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F1F5F9" />
      </linearGradient>
    </defs>
    <rect x="4" y="7" width="24" height="18" rx="6" fill="url(#bodyGrad)" />
    <line x1="8" y1="9.5" x2="24" y2="9.5" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
    {/* 왼쪽 수신 패널 (귀) — 머리와 연결선 없이 부착 */}
    <rect x="2.5" y="11.5" width="1.5" height="8" rx="0.75" fill="#DBE2EF" />
    <line x1="2.5" y1="14" x2="4" y2="14" stroke="#1E4D8C" strokeWidth="0.5" opacity="0.2" />
    <line x1="2.5" y1="17" x2="4" y2="17" stroke="#1E4D8C" strokeWidth="0.5" opacity="0.2" />
    {/* 오른쪽 수신 패널 (귀) */}
    <rect x="28" y="11.5" width="1.5" height="8" rx="0.75" fill="#DBE2EF" />
    <line x1="28" y1="14" x2="29.5" y2="14" stroke="#1E4D8C" strokeWidth="0.5" opacity="0.2" />
    <line x1="28" y1="17" x2="29.5" y2="17" stroke="#1E4D8C" strokeWidth="0.5" opacity="0.2" />
    {children}
  </>
);

const Mouth = ({ mouth }: { mouth?: 'auto' | 'smile' | 'open' | 'wavy' }) => (
  mouth === 'smile' ? (
    <path d="M12 20.5 Q16 23.5 20 20.5" stroke="#1E4D8C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  ) : mouth === 'open' ? (
    <ellipse cx="16" cy="20.5" rx="2" ry="2.5" fill="#1E4D8C" />
  ) : mouth === 'wavy' ? (
    <path d="M12 21 Q13.5 20 14 21 Q14.5 22 16 21 Q17.5 20 18 21 Q18.5 22 20 21" stroke="#1E4D8C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  ) : (
    <>
      <path d="M12 21 Q16 22.5 20 21" stroke="#1E4D8C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="9.5" cy="19" r="1.8" fill="#1E4D8C" opacity="0.08" />
      <circle cx="22.5" cy="19" r="1.8" fill="#1E4D8C" opacity="0.08" />
    </>
  )
);

const AnimatedEye = ({ cx, eyeRef, animated, mouth }: {
  cx: number; eyeRef: React.RefObject<SVGGElement | null>; animated: boolean; mouth?: string;
}) => {
  const isHappy = mouth === 'smile';

  return (
    <g ref={eyeRef} transform={`translate(${cx}, 15)`}>
      {isHappy ? (
        <path d="M-1.8 0.5 Q0 -2.5 1.8 0.5" stroke="#1E4D8C" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <rect x="-1.5" y="-2.5" width="3" height="5" rx="1.5" fill="#1E4D8C">
          {animated && <animateTransform attributeName="transform" type="scale" values="1 1; 1 1; 2.5 0.3; 2.5 0.3; 1 1" keyTimes="0; 0.85; 0.92; 0.96; 1" dur="3s" repeatCount="indefinite" additive="sum" />}
        </rect>
      )}
    </g>
  );
};

// ── 메인 컴포넌트 ──
export function LogoIcon({ className = 'w-[22px] h-[22px]', crying, mouth, animated = true, followMouse, resetEyes, analyzing, dizzy }: {
  className?: string; crying?: boolean; mouth?: 'auto' | 'smile' | 'open'; animated?: boolean; followMouse?: boolean; resetEyes?: boolean; analyzing?: boolean; dizzy?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyeLeftRef = useRef<SVGGElement>(null);
  const eyeRightRef = useRef<SVGGElement>(null);
  const currentOffset = useRef({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!followMouse) return;
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
      if (eyeLeftRef.current) eyeLeftRef.current.setAttribute('transform', `translate(${12 + x}, ${15 + y})`);
      if (eyeRightRef.current) eyeRightRef.current.setAttribute('transform', `translate(${20 + x}, ${15 + y})`);
      rafId = requestAnimationFrame(animate);
    };
    window.addEventListener('mousemove', handleMouseMove);
    let rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [followMouse]);

  useEffect(() => {
    if (!resetEyes) return;
    currentOffset.current = { x: 0, y: 0 };
    targetOffset.current = { x: 0, y: 0 };
    if (eyeLeftRef.current) eyeLeftRef.current.setAttribute('transform', 'translate(12, 15)');
    if (eyeRightRef.current) eyeRightRef.current.setAttribute('transform', 'translate(20, 15)');
  }, [resetEyes]);

  if (crying) {
    return (
      <svg viewBox="0 -4 32 36" className={className} fill="none">
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -0.8; 0 0; 0 0.5; 0 0; 0 -0.3; 0 0" dur="2s" repeatCount="indefinite" />
          <RobotBody>
            <rect x="10.5" y="12" width="3" height="5" rx="1.5" fill="#1E4D8C" />
            <rect x="18.5" y="12" width="3" height="5" rx="1.5" fill="#1E4D8C" />
          </RobotBody>
      <Antenna analyzing={analyzing} />
          <path d="M13 21 Q16 19 19 21" stroke="#1E4D8C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="11" cy="17" r="1.3" fill="#60A5FA">
            <animate attributeName="cy" values="17;17;30" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;1" />
            <animate attributeName="opacity" values="0;0;0.8;0" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
          </circle>
          <circle cx="21" cy="17" r="1.3" fill="#60A5FA">
            <animate attributeName="cy" values="17;17;30" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;1" begin="0.3s" />
            <animate attributeName="opacity" values="0;0;0.8;0" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" begin="0.3s" />
          </circle>
        </g>
      </svg>
    );
  }

  return (
    <svg ref={svgRef} viewBox="0 -4 32 36" className={className} fill="none">
      <RobotBody>
        {dizzy ? (
          <>
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 12 16.25" to="360 12 16.25" dur="1s" repeatCount="indefinite" />
              <text x="12" y="17.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1E4D8C" fontFamily="sans-serif">@</text>
            </g>
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 20 16.25" to="360 20 16.25" dur="1s" repeatCount="indefinite" />
              <text x="20" y="17.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1E4D8C" fontFamily="sans-serif">@</text>
            </g>
          </>
        ) : (
          <>
            <AnimatedEye cx={12} eyeRef={eyeLeftRef} animated={animated} mouth={mouth} />
            <AnimatedEye cx={20} eyeRef={eyeRightRef} animated={animated} mouth={mouth} />
          </>
        )}
      </RobotBody>
      <Antenna analyzing={analyzing} />
      <Mouth mouth={dizzy ? 'wavy' : mouth} />
    </svg>
  );
}
