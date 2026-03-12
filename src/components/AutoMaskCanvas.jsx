import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, MessageSquare, Trash2, RotateCw } from 'lucide-react';
import { useAutoMask } from '../hooks/useAutoMask';
import './ImagePreview.css'; // Reusing the same base styles
import './AutoMaskCanvas.css';

/**
 * AutoMaskCanvas — Human-in-the-loop masking canvas.
 * Allows drawing a green box or auto-detecting via N8N.
 */
const AutoMaskCanvas = forwardRef(function AutoMaskCanvas({ imageUrl, imageBase64 }, ref) {
    const imgRef = useRef(null);
    const canvasWrapRef = useRef(null);
    const [promptText, setPromptText] = useState("");
    const [isDetecting, setIsDetecting] = useState(false);

    const {
        maskCanvasRef,
        maskBox,
        updateMaskBox,
        setMaskBoxFromAI,
        clearMask,
        bakeMask,
        bakeImageWithRedBox,
        handlers
    } = useAutoMask(imgRef.current, canvasWrapRef.current, imageBase64);

    // Sync canvas dimensions to photo dimensions when image loads
    useEffect(() => {
        const img = imgRef.current;
        const canvas = maskCanvasRef.current;
        if (!img || !canvas) return;

        const sync = () => {
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
        };

        if (img.complete && img.naturalWidth > 0) sync();
        img.addEventListener('load', sync);
        return () => img.removeEventListener('load', sync);
    }, [imageUrl, maskCanvasRef]);

    useImperativeHandle(ref, () => ({
        getMaskBase64: async () => await bakeMask(),
        getImageWithRedBox: async () => await bakeImageWithRedBox(),
        getPrompt: () => promptText.trim(),
        hasMask: () => maskBox !== null,
        getRawBox: () => {
             if (!maskBox || !maskCanvasRef.current || !canvasWrapRef.current) return maskBox;
             const canvas = maskCanvasRef.current;
             const displayWidth = canvas.offsetWidth || canvasWrapRef.current.offsetWidth || canvas.clientWidth || 1;
             const displayHeight = canvas.offsetHeight || canvasWrapRef.current.offsetHeight || canvas.clientHeight || 1;
             const scaleX = canvas.width / displayWidth;
             const scaleY = canvas.height / displayHeight;
             return {
                 ...maskBox,
                 x: Math.round(maskBox.x * scaleX),
                 y: Math.round(maskBox.y * scaleY),
                 width: Math.round(maskBox.width * scaleX),
                 height: Math.round(maskBox.height * scaleY),
                 containerWidth: canvas.width,
                 containerHeight: canvas.height
             };
        },
        getMaskBox: () => maskBox ? { ...maskBox, containerWidth: canvasWrapRef.current?.offsetWidth || 1, containerHeight: canvasWrapRef.current?.offsetHeight || 1 } : null
    }), [bakeMask, promptText, maskBox]);

    // Implementación de Auto-Detección vía Webhook
    const handleAutoDetect = async () => {
        if (!maskCanvasRef.current) return;
        
        // Ensure we have the base64 image data
        if (!imageBase64) {
            alert("No se encontró la imagen para analizar.");
            return;
        }
        
        setIsDetecting(true);
        
        try {
            const webhookUrl = "https://abrahampruebas2.app.n8n.cloud/webhook/pre-analisis-vision";
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagen: imageBase64 })
            });

            if (!response.ok) {
                throw new Error(`Error en el servidor: ${response.statusText}`);
            }

            // Expected format depends on workflow output (e.g. {x, y, width, height} or {box_2d: [...]})
            const data = await response.json();
            console.log("Respuesta pre-análisis:", data);
            
            const rect = maskCanvasRef.current.getBoundingClientRect();
            let bx, by, bw, bh;
            let foundBox = false;

            // Try to parse standard bounding box formats
            if (data && data.x !== undefined && data.y !== undefined && data.width !== undefined && data.height !== undefined) {
                bx = data.x; 
                by = data.y; 
                bw = data.width; 
                bh = data.height;
                foundBox = true;
            } else if (data && Array.isArray(data.box_2d) && data.box_2d.length === 4) {
               // [xmin, ymin, xmax, ymax]
                bx = data.box_2d[0];
                by = data.box_2d[1];
                bw = data.box_2d[2] - data.box_2d[0];
                bh = data.box_2d[3] - data.box_2d[1];
                foundBox = true;
            } else if (data && data.bbox && data.bbox.length === 4) {
                // Another common format [x, y, w, h] or [xmin, ymin, xmax, ymax]
                // Assuming [x, y, w, h] for this check if w/h are typical
                if (data.bbox[2] > data.bbox[0]) {
                    // xmin, ymin, xmax, ymax
                    bx = data.bbox[0];
                    by = data.bbox[1];
                    bw = data.bbox[2] - data.bbox[0];
                    bh = data.bbox[3] - data.bbox[1];
                } else {
                    bx = data.bbox[0];
                    by = data.bbox[1];
                    bw = data.bbox[2];
                    bh = data.bbox[3];
                }
                foundBox = true;
            }

            if (foundBox) {
                // Apply scaling if coordinates are relative (0 to 1) instead of pixel values
                if (bw <= 1 && bh <= 1) {
                    bx = bx * rect.width;
                    by = by * rect.height;
                    bw = bw * rect.width;
                    bh = bh * rect.height;
                }
                setMaskBoxFromAI(bx, by, bw, bh);
            } else {
                // Fallback to center box if no valid coordinates found
                console.warn("Formato de coordenadas no reconocido, usando recuadro por defecto.");
                bw = rect.width * 0.4;
                bh = bw * 0.4;
                bx = (rect.width - bw) / 2;
                by = (rect.height - bh) / 3;
                setMaskBoxFromAI(bx, by, bw, bh);
            }

        } catch (error) {
            console.error("Error de Auto-Detección:", error);
            alert("Hubo un problema al auto-detectar el área. Intenta dibujarla manualmente.");
        } finally {
            setIsDetecting(false);
        }
    };

    return (
        <div className="mask-canvas-section fade-in-up">
            {/* ── Toolbar ── */}
            <div className="mask-toolbar glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', gap: '12px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                <button 
                    className="btn btn-primary" 
                    onClick={handleAutoDetect} 
                    disabled={isDetecting}
                    title="Pedir a la IA que busque la ventana"
                    style={{ padding: '8px 16px', fontSize: '14px', flex: 1, justifyContent: 'center' }}
                >
                    <Sparkles size={16} /> 
                    {isDetecting ? 'Buscando...' : 'Auto-Detectar Área'}
                </button>
                <button 
                    className="btn btn-ghost" 
                    onClick={clearMask} 
                    title="Borrar recuadro" 
                    disabled={!maskBox}
                    style={{ padding: '8px 16px', fontSize: '14px', flex: 1, justifyContent: 'center' }}
                >
                    <Trash2 size={16} /> Borrar Máscara
                </button>
            </div>

            {/* ── Canvas + Image ── */}
            <div 
                className="canvas-wrap glass" 
                ref={canvasWrapRef}
                {...handlers} // Attach pointer events for drawing
                style={{ touchAction: 'none' }} // Crucial for mobile drawing
            >
                <div className="canvas-positioner">
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Fachada para enmascarar"
                        className="canvas-bg-image"
                        draggable={false}
                        crossOrigin="anonymous"
                    />
                    
                    {/* Hidden canvas used only for baking at generation time */}
                    <canvas
                        ref={maskCanvasRef}
                        className="mask-canvas"
                        style={{ opacity: 0, pointerEvents: 'none' }}
                        id="mask-canvas"
                    />

                    {/* Render Interactive Box */}
                    {maskBox && (
                        <TransformableBox
                            box={maskBox}
                            onUpdate={updateMaskBox}
                            onDelete={clearMask}
                            containerRef={canvasWrapRef}
                        />
                    )}
                </div>

                {!maskBox && !isDetecting && (
                    <div className="preview-hint" style={{ pointerEvents: 'none' }}>
                        Dibuja un rectángulo sobre la ventana o usa Auto-Detectar
                    </div>
                )}
            </div>

            {/* ── Custom Prompt Textarea ── */}
            <div className="prompt-section mask-toolbar glass" style={{ padding: '12px' }}>
                <div style={{ width: '100%' }}>
                    <div className="prompt-header">
                        <MessageSquare size={14} />
                        <span>Instrucciones adicionales para la IA (Opcional)</span>
                    </div>
                    <textarea 
                        className="prompt-textarea" 
                        placeholder="Ej: Instalar cubriendo toda la terraza, rayas gruesas..."
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        rows={2}
                    />
                </div>
            </div>
        </div>
    );
});

export default AutoMaskCanvas;

// ── Interactive Box Component ──
function TransformableBox({ box, onUpdate, onDelete }) {
    const boxRef = useRef(null);
    const dragData = useRef({ type: null, startX: 0, startY: 0, initX: 0, initY: 0, initW: 0, initH: 0, initRot: 0 });

    const handlePointerDown = (e, type) => {
        e.stopPropagation();

        dragData.current = {
            type,
            startX: e.clientX || e.touches?.[0]?.clientX,
            startY: e.clientY || e.touches?.[0]?.clientY,
            initX: box.x,
            initY: box.y,
            initW: box.width,
            initH: box.height,
            initRot: box.rotation || 0
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e) => {
        e.preventDefault(); // Prevent scrolling while adjusting box
        
        const { type, startX, startY, initX, initY, initW, initH, initRot } = dragData.current;
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (type === 'move') {
            onUpdate({ x: initX + dx, y: initY + dy });
        } 
        else if (type === 'scale') {
            // Unconstrained scale for masking (unlike awning PNGs, area masks can change aspect ratio)
            // But for simplicity, we'll scale from bottom right
            const newW = Math.max(30, initW + dx);
            const newH = Math.max(30, initH + dy);
            onUpdate({ width: newW, height: newH });
        }
        else if (type === 'rotate') {
            if (!boxRef.current) return;
            const rect = boxRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const initAngle = Math.atan2(startY - centerY, startX - centerX);
            const currentAngle = Math.atan2(clientY - centerY, clientX - centerX);
            const angleDiff = (currentAngle - initAngle) * (180 / Math.PI);
            
            onUpdate({ rotation: initRot + angleDiff });
        }
    };

    const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
    };

    // Clean up event listeners if unmounted while dragging
    useEffect(() => {
        return handlePointerUp;
    }, []);

    return (
        <div
            ref={boxRef}
            className="transformable-box"
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            style={{
                position: 'absolute',
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                transform: `rotate(${box.rotation || 0}deg)`,
                transformOrigin: 'center center',
                touchAction: 'none',
                cursor: 'move',
            }}
        >
            {/* The semi-transparent green mask visualization */}
            <div className="mask-box-fill" />
            
            {/* Bounding box outline */}
            <div className="mask-box-border" />
            
            {/* Handles */}
            <div 
                className="mask-handle delete-handle" 
                onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
                title="Eliminar máscara"
            >
                <Trash2 size={12} color="white" />
            </div>

            <div 
                className="mask-handle rotate-handle"
                onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                title="Rotar máscara"
            >
                <RotateCw size={12} color="white" />
            </div>

            <div 
                className="mask-handle scale-handle"
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                title="Escalar máscara libremente"
            />
        </div>
    );
}
