import React from 'react';

interface LogoProps {
  className?: string;
  inverted?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10", inverted = false }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bizflow_grad_react" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    
    {/* Fundo Quadrado Arredondado */}
    <rect 
      x="0" y="0" width="512" height="512" rx="120" 
      fill={inverted ? "white" : "url(#bizflow_grad_react)"} 
    />
    
    {/* Linhas */}
    <path d="M110 160 H 402" stroke={inverted ? "#2563EB" : "white"} strokeWidth="45" strokeLinecap="round" />
    <path d="M110 266 H 402" stroke={inverted ? "#2563EB" : "white"} strokeWidth="45" strokeLinecap="round" opacity="0.85" />
    <path d="M110 372 H 260" stroke={inverted ? "#2563EB" : "white"} strokeWidth="45" strokeLinecap="round" opacity="0.7" />
    
    {/* Círculo */}
    <circle cx="382" cy="382" r="90" fill={inverted ? "#2563EB" : "white"} />
    
    {/* Seta */}
    <g transform="translate(382, 382) scale(0.9)">
        <path d="M-25 25 L35 -35" stroke={inverted ? "white" : "#2563EB"} strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-15 -35 H35 V15" stroke={inverted ? "white" : "#2563EB"} strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);