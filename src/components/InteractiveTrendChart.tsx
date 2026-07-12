'use client';

import React, { useState } from 'react';

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  value: string;
  date?: string;
}

export default function InteractiveTrendChart({ chartPoints, svgPath }: { chartPoints: ChartPoint[], svgPath: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (chartPoints.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        No emission transactions logged yet.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg width="100%" height="100%" viewBox="0 0 500 130" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {/* Horizontal Grid lines */}
        <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />

        {/* Line graph curved path */}
        {svgPath && (
          <>
            {/* Shadow Area below curve */}
            <path
              d={`${svgPath} L ${chartPoints[chartPoints.length - 1].x} 120 L ${chartPoints[0].x} 120 Z`}
              fill="url(#chart-area-grad)"
              style={{
                opacity: hoveredIdx !== null ? 0.8 : 1,
                transition: 'opacity 0.3s ease'
              }}
            />
            {/* Stroke line */}
            <path 
              d={svgPath} 
              fill="none" 
              stroke="var(--accent-env)" 
              strokeWidth="2.5"
              style={{
                filter: hoveredIdx !== null ? 'drop-shadow(0 0 8px var(--accent-env))' : 'none',
                transition: 'filter 0.3s ease'
              }}
            />
          </>
        )}

        {/* Nodes with hover animations */}
        {chartPoints.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g 
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r={isHovered ? "8" : "5"} 
                fill="#111827" 
                stroke={isHovered ? "#34d399" : "var(--accent-env)"} 
                strokeWidth={isHovered ? "3" : "2"} 
                style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r={isHovered ? "16" : "8"} 
                fill="var(--accent-env)" 
                opacity={isHovered ? "0.4" : "0.2"} 
                style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
              
              <text 
                x={pt.x} 
                y="130" 
                fill={isHovered ? "#fff" : "var(--text-muted)"} 
                fontSize={isHovered ? "10" : "8"} 
                fontWeight={isHovered ? "700" : "400"}
                textAnchor="middle"
                style={{ transition: 'all 0.2s ease' }}
              >
                {pt.label}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-env)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-env)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>

      {/* HTML Tooltip overlay */}
      {hoveredIdx !== null && (
        <div 
          style={{
            position: 'absolute',
            left: `${(chartPoints[hoveredIdx].x / 500) * 100}%`,
            top: `${(chartPoints[hoveredIdx].y / 130) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4), 0 0 12px rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.8rem',
            pointerEvents: 'none',
            zIndex: 50,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            minWidth: '120px',
            animation: 'fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {chartPoints[hoveredIdx].date || chartPoints[hoveredIdx].label}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
            {chartPoints[hoveredIdx].value} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)' }}>t CO2e</span>
          </div>
          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translate(-50%, -110%) scale(0.95); }
              to { opacity: 1; transform: translate(-50%, -120%) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
