import { Sparkles, Loader2, Brain } from 'lucide-react';
import './LoadingOverlay.css';

export function LoadingOverlay({ stage = 'uploading' }) {
    const stages = [
        { key: 'uploading', label: 'Subiendo imagen a la nube…', icon: '☁️' },
        { key: 'segmenting', label: 'Analizando la fachada…', icon: '🔍' },
        { key: 'generating', label: 'La IA está pintando tu toldo…', icon: '🎨' },
        { key: 'finalizing', label: 'Últimos retoques…', icon: '✨' },
    ];

    const currentIdx = stages.findIndex(s => s.key === stage);

    return (
        <div className="loading-overlay fade-in-up">
            <div className="loading-card glass">
                {/* Animated brain icon */}
                <div className="loading-icon-wrap">
                    <div className="loading-pulse-ring" />
                    <div className="loading-pulse-ring ring-2" />
                    <Brain size={40} strokeWidth={1.3} className="loading-brain" />
                </div>

                <h2 className="loading-title gradient-text">Generando render con IA</h2>
                <p className="loading-sub">Esto puede tardar entre 15 y 45 segundos</p>

                {/* Stage steps */}
                <div className="loading-stages">
                    {stages.map((s, i) => (
                        <div
                            key={s.key}
                            className={`loading-stage ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'active' : ''}`}
                        >
                            <span className="stage-icon">{s.icon}</span>
                            <span className="stage-label">{s.label}</span>
                            {i < currentIdx && <span className="stage-tick">✓</span>}
                            {i === currentIdx && <Loader2 size={14} className="stage-spinner" />}
                        </div>
                    ))}
                </div>

                <div className="loading-bar-wrap">
                    <div className="loading-bar-track">
                        <div
                            className="loading-bar-fill"
                            style={{ width: `${Math.round(((currentIdx + 1) / stages.length) * 100)}%` }}
                        />
                    </div>
                </div>

                <p className="loading-tip">
                    <Sparkles size={12} />
                    Consejo: mejor resultado con fotos tomadas en luz natural directa
                </p>
            </div>
        </div>
    );
}
