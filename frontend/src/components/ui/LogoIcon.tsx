import { useRef, useEffect, type ReactNode } from 'react';

// ── 공통 SVG 요소 ──
const Antenna = ({ animated }: { animated: boolean }) => (
  <>
    <line x1="16" y1="7" x2="16" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="2" x2="13" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="13" cy="2" r="1.5" fill="white" className={animated ? 'animate-logo-antenna' : ''} />
  </>
);
const RobotBody = ({ children }: { children: ReactNode }) => (
  <>
    <rect x="4" y="7" width="24" height="18" rx="6" fill="white" />
    <line x1="2" y1="16" x2="4" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <line x1="28" y1="16" x2="30" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <line x1="10" y1="9" x2="22" y2="9" stroke="#1E4D8C" strokeWidth="0.5" opacity="0.15" />
    {children}
  </>
);
const Mouth = ({ mouth }: { mouth?: 'auto' | 'smile' | 'open' }) => (
  mouth === 'smile' ? (
    <path d="M12 20.5 Q16 23.5 20 20.5" stroke="#1E4D8C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  ) : mouth === 'open' ? (
    <ellipse cx="16" cy="20.5" rx="2" ry="2.5" fill="#1E4D8C" />
  ) : (
    <>
      <path d="M12 21 Q16 22.5 20 21" stroke="#1E4D8C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="9.5" cy="19" r="1.8" fill="#1E4D8C" opacity="0.08" />
      <circle cx="22.5" cy="19" r="1.8" fill="#1E4D8C" opacity="0.08" />
    </>
  )
);
const Tear = ({ cx, begin }: { cx: number; begin?: string }) => (
  <circle cx={cx} cy="17" r="1.3" fill="#60A5FA">
    <animate attributeName="cy" values="17;17;30" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;1" />
    <animate attributeName="opacity" values="0;0;0.8;0" dur="1.5s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
  </circle>
);
const StaticEye = ({ cx }: { cx: number }) => (
  <g transform={`translate(${cx}, 15)`}>
    <rect x="-1.5" y="-2.5" width="3" height="5" rx="1.5" fill="#1E4D8C" />
  </g>
);
const AnimatedEye = ({ cx, eyeRef, animated }: { cx: number; eyeRef: React.RefObject<SVGGElement | null>; animated: boolean }) => (
  <g ref={eyeRef} transform={`translate(${cx}, 15)`}>
    <rect x="-1.5" y="-2.5" width="3" height="5" rx="1.5" fill="#1E4D8C">
      {animated && <animateTransform attributeName="transform" type="scale" values="1 1; 1 1; 2.5 0.3; 2.5 0.3; 1 1" keyTimes="0; 0.85; 0.92; 0.96; 1" dur="3s" repeatCount="indefinite" additive="sum" />}
    </rect>
  </g>
);

// ── 메인 컴포넌트 ──
export function LogoIcon({ className = 'w-[22px] h-[22px]', crying, mouth, animated = true, followMouse, resetEyes }: {
  className?: string; crying?: boolean; mouth?: 'auto' | 'smile' | 'open'; animated?: boolean; followMouse?: boolean; resetEyes?: boolean;
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
      <svg viewBox="0 0 32 32" className={className} fill="none">
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -0.8; 0 0; 0 0.5; 0 0; 0 -0.3; 0 0" dur="2s" repeatCount="indefinite" />
          <Antenna animated />
          <RobotBody>
            <StaticEye cx={12} />
            <StaticEye cx={20} />
          </RobotBody>
          <path d="M13 21 Q16 19 19 21" stroke="#1E4D8C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <Tear cx={11} />
          <Tear cx={21} begin="0.3s" />
        </g>
      </svg>
    );
  }

  return (
    <svg ref={svgRef} viewBox="0 0 32 32" className={`${className} ${animated ? 'animate-logo-bot' : ''}`} fill="none">
      <Antenna animated={animated} />
      <RobotBody>
        <AnimatedEye cx={12} eyeRef={eyeLeftRef} animated={animated} />
        <AnimatedEye cx={20} eyeRef={eyeRightRef} animated={animated} />
      </RobotBody>
      <Mouth mouth={mouth} />
    </svg>
  );
}
