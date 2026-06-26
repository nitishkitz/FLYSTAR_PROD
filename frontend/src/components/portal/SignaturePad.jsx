import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

/**
 * Lightweight signature pad — pointer events, no external deps.
 * Calls onChange(dataUrl) with a PNG data URL whenever a stroke ends.
 * Pass `value=null` to clear externally.
 */
export default function SignaturePad({ onChange, height = 180 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b2545';
    ctx.lineWidth = 2.2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, height);
  }, [height]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    try { canvasRef.current.releasePointerCapture(e.pointerId); } catch {}
    setEmpty(false);
    onChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, height);
    setEmpty(true);
    onChange?.(null);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px dashed rgba(11, 37, 69, 0.18)', background: 'white' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
          style={{ display: 'block', width: '100%', height, touchAction: 'none', cursor: 'crosshair' }}
          data-testid="signature-canvas"
        />
        {empty && (
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#9aa9bf', fontSize: 13, pointerEvents: 'none' }}>
            Sign here
          </span>
        )}
      </div>
      <div className="row mt-12" style={{ justifyContent: 'space-between' }}>
        <small className="muted">Customer's signature on delivery</small>
        <button type="button" onClick={clear} className="btn btn-outline btn-tiny" data-testid="clear-signature"><Eraser size={12} />Clear</button>
      </div>
    </div>
  );
}
