import { useId } from "react";

const outline = "M 495 130 C 454 65 365 65 335 115 C 258 95 190 132 190 195 C 123 190 83 245 109 305 C 40 348 54 428 104 459 C 63 520 97 590 155 607 C 133 675 197 731 263 716 C 275 790 355 812 405 773 C 450 800 488 755 495 700 Z";
export default function PipelineBrain() {
  const id = useId().replaceAll(":", "");
  return <svg className="pipeline-brain" viewBox="0 0 1000 900" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-fill`} x2="1" y2="1"><stop stopColor="#123446" stopOpacity=".45" /><stop offset="1" stopColor="#242044" stopOpacity=".25" /></linearGradient>
      <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
    {[false, true].map((right) => <g key={String(right)} transform={right ? "translate(1000 0) scale(-1 1)" : undefined}>
      <path d={outline} fill={`url(#${id}-fill)`} stroke="#67e8f9" strokeOpacity=".24" strokeWidth="1.5" />
      {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${150 + i * 28} ${190 + (i % 3) * 35} C ${70 + i * 37} ${330 + i * 16}, ${430 - i * 18} ${430 + i * 12}, ${220 + i * 24} ${710 - i * 10}`} fill="none" stroke={i % 3 ? "#38bdf8" : "#a78bfa"} strokeOpacity=".17" strokeWidth="1" />)}
      {Array.from({ length: 24 }, (_, i) => {
        const x = 135 + ((i * 79) % 330), y = 170 + ((i * 137) % 555);
        return <g key={i}><circle cx={x} cy={y} r="6" fill="#67e8f9" opacity=".25" filter={`url(#${id}-glow)`} /><circle cx={x} cy={y} r="1.7" fill="#7dd3fc" opacity=".55" /></g>;
      })}
    </g>)}
    <path d="M 500 140 Q 482 440 500 720 Q 520 795 554 825" fill="none" stroke="#a78bfa" strokeOpacity=".25" />
  </svg>;
}
