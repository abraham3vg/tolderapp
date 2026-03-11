import { Check, ChevronDown } from 'lucide-react';
import { AWNING_TYPES, AWNING_COLORS } from '../data/catalog';
import './CatalogSelector.css';

export function CatalogSelector({ selectedType, selectedModel, selectedColor, onTypeChange, onModelChange, onColorChange }) {
    
    const handleTypeSelect = (e) => {
        const typeId = e.target.value;
        if (!typeId) {
            onTypeChange(null);
            onModelChange(null);
            return;
        }
        const found = AWNING_TYPES.find(t => t.id === typeId);
        onTypeChange(found);
        // Reset model when type changes
        onModelChange(null);
    };

    const handleModelSelect = (e) => {
        const modelId = e.target.value;
        if (!modelId || !selectedType) {
            onModelChange(null);
            return;
        }
        const foundModel = selectedType.models?.find(m => m.id === modelId);
        onModelChange(foundModel);
    };

    return (
        <div className="catalog-selector fade-in-up">

            {/* ── Awning Type Dropdown ── */}
            <div className="catalog-section">
                <h3 className="catalog-heading">1. Categoría de Toldo</h3>
                <div className="select-wrapper">
                    <select 
                        className="custom-select" 
                        value={selectedType?.id || ""} 
                        onChange={handleTypeSelect}
                        id="select-awning-type"
                    >
                        <option value="">Selecciona una categoría...</option>
                        {AWNING_TYPES.map(t => (
                            <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                </div>
                {selectedType && (
                    <p className="type-desc-hint">{selectedType.description}</p>
                )}
            </div>

            {/* (Modelo de Stock movido al lado del Canvas en App.jsx) */}

            {/* ── Color ── */}
            <div className="catalog-section">
                <h3 className="catalog-heading">{selectedType ? '3. Color / Patrón' : 'Color / Patrón'}</h3>
                <div className="color-grid">
                    {AWNING_COLORS.map((c) => (
                        <button
                            key={c.id}
                            className={`color-swatch ${selectedColor?.id === c.id ? 'selected' : ''}`}
                            onClick={() => onColorChange(c)}
                            id={`btn-color-${c.id}`}
                            title={c.label}
                        >
                            {c.hex ? (
                                <span
                                    className="swatch-dot"
                                    style={{ background: c.hex }}
                                />
                            ) : (
                                <span className="swatch-dot swatch-stripes" />
                            )}
                            <span className="swatch-label">{c.label}</span>
                            {selectedColor?.id === c.id && (
                                <span className="swatch-check">
                                    <Check size={10} />
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Summary ── */}
            {/* (Resumen y preview movidos al lienzo principal) */}
        </div>
    );
}
