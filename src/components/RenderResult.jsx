import { useRef, useState } from 'react';
import { Download, RefreshCw, Share2, ZoomIn, Star } from 'lucide-react';
import './RenderResult.css';

export function RenderResult({ resultUrl, originalUrl, config, onReset }) {
    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `toldo-render-${config?.type?.id ?? 'resultado'}.jpg`;
        a.click();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                const res = await fetch(resultUrl);
                const blob = await res.blob();
                const file = new File([blob], 'render-toldo.jpg', { type: blob.type });
                await navigator.share({ title: 'Render de Toldo IA', files: [file] });
            } catch {
                navigator.clipboard?.writeText(resultUrl);
                alert('URL copiada al portapapeles');
            }
        } else {
            navigator.clipboard?.writeText(resultUrl);
            alert('URL copiada al portapapeles');
        }
    };

    return (
        <div className="result-section fade-in-up">
            <div className="result-header">
                <div>
                    <h2 className="result-title gradient-text">¡Render listo! ✨</h2>
                    <p className="result-sub">
                        {config?.type?.label} · {config?.color?.label}
                    </p>
                </div>
                <div className="result-badge">
                    <Star size={14} fill="currentColor" /> IA generado
                </div>
            </div>

            {/* Before/After Comparison Slider */}
            <div className="result-comparison">
                <CompareSlider beforeUrl={originalUrl} afterUrl={resultUrl} />
            </div>

            {/* CTA Buttons */}
            <div className="result-actions">
                <button className="btn btn-success" onClick={handleDownload} id="btn-download-render">
                    <Download size={18} /> Descargar render
                </button>
                <a
                    className="btn btn-ghost"
                    href={resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="btn-view-fullhd"
                >
                    <ZoomIn size={18} /> Ver Full HD
                </a>
                <button className="btn btn-ghost" onClick={handleShare} id="btn-share-render">
                    <Share2 size={18} /> Compartir
                </button>
                <button className="btn btn-ghost" onClick={onReset} id="btn-new-render">
                    <RefreshCw size={18} /> Nuevo render
                </button>
            </div>
        </div>
    );
}

function CompareSlider({ beforeUrl, afterUrl }) {
    const [pos, setPos] = useState(50);
    const trackRef = useRef(null);

    const onMove = (e) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        setPos(pct);
    };

    return (
        <div
            ref={trackRef}
            className="compare-wrap"
            onMouseMove={(e) => e.buttons === 1 && onMove(e)}
            onTouchMove={onMove}
            id="compare-slider"
            aria-label="Desliza para comparar antes y después"
        >
            {/* Before */}
            <img src={beforeUrl} className="compare-img" alt="Antes" draggable={false} />

            {/* After (clipped) */}
            <div className="compare-after" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                <img src={afterUrl} className="compare-img" alt="Después (render IA)" draggable={false} />
                <span className="compare-label after-label">IA</span>
            </div>

            {/* Divider handle */}
            <div className="compare-divider" style={{ left: `${pos}%` }}>
                <div className="compare-handle">
                    <span className="handle-arrow">⟺</span>
                </div>
                <span className="compare-label before-label">Original</span>
            </div>
        </div>
    );
}
