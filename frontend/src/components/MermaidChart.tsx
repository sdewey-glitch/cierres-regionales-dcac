import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'inherit',
    primaryColor: '#f8fafc',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#cbd5e1',
    lineColor: '#64748b',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#f8fafc',
  }
});

interface MermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (svgRef.current) {
      const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(id, chart).then((result) => {
        if (svgRef.current) {
          svgRef.current.innerHTML = result.svg;
          // Make SVG fill container
          const svg = svgRef.current.querySelector('svg');
          if (svg) {
            svg.style.maxWidth = 'none';
            svg.style.width = '100%';
            svg.style.height = 'auto';
          }
        }
      }).catch(err => {
        console.error("Mermaid render error:", err);
        if (svgRef.current) {
          svgRef.current.innerHTML = `<div style="padding:2rem;color:#ef4444;font-weight:bold;">Error de sintaxis Mermaid: ${err.message || err}</div>`;
        }
      });
    }
  }, [chart]);

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s + 0.15, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s - 0.15, 0.2));
  }, []);

  const handleReset = useCallback(() => {
    setScale(0.85);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(s => Math.max(0.2, Math.min(3, s + delta)));
  }, []);

  // Pan with mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setTranslate({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomPct = Math.round(scale * 100);

  return (
    <div className="relative w-full" style={{ minHeight: '400px' }}>
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-1.5 py-1">
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-lg font-bold"
          title="Alejar"
        >
          −
        </button>
        <span className="text-[10px] font-bold text-slate-500 w-10 text-center select-none">{zoomPct}%</span>
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-lg font-bold"
          title="Acercar"
        >
          +
        </button>
        <div className="w-px h-5 bg-slate-200 mx-0.5" />
        <button
          onClick={handleReset}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Resetear vista"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Zoomable & Pannable Canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm"
        style={{ height: '500px', cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={svgRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        />
      </div>
    </div>
  );
};

export default MermaidChart;
