import { useState, useCallback, useRef } from 'react';

/**
 * useAutoMask — Manages the interactive green selection box.
 * Can be drawn manually by the user or set programmatically by an AI webhook.
 */
export function useAutoMask(imageEl, containerEl) {
    const maskCanvasRef = useRef(null);
    
    // We only support one active mask box at a time for simplicity and clarity.
    const [maskBox, setMaskBox] = useState(null); 
    // State to track if the user is currently drawing a new box
    const isDrawing = useRef(false);
    const startPoint = useRef({ x: 0, y: 0 });

    const clearMask = useCallback(() => {
        setMaskBox(null);
    }, []);

    const updateMaskBox = useCallback((updates) => {
        setMaskBox(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    // Set a mask box directly from AI coordinates
    const setMaskBoxFromAI = useCallback((x, y, width, height) => {
        setMaskBox({
            id: 'auto-mask-' + Date.now(),
            x,
            y,
            width,
            height,
            rotation: 0
        });
    }, []);

    // Bakes the HTML DOM mask box into the actual hidden pixel canvas 
    // so it can be exported to N8N as a single black and white mask.
    const bakeMask = useCallback(async () => {
        if (!maskBox) return null; // No mask, return null

        const canvas = maskCanvasRef.current;
        if (!canvas) return null;
        
        const rect = canvas.getBoundingClientRect();
        // Calculate the ratio between the internal high-res canvas and the current screen CSS size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const ctx = canvas.getContext('2d');
        
        // Fill the entire canvas with black (standard inpainting mask background)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawWidth = maskBox.width * scaleX;
        const drawHeight = maskBox.height * scaleY;
        const drawX = maskBox.x * scaleX;
        const drawY = maskBox.y * scaleY;

        ctx.save();
        // Move to the center of the item
        ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
        // Rotate
        ctx.rotate((maskBox.rotation || 0) * Math.PI / 180);
        
        // Apply Feathering (Blur) to the mask edges so the AI inpaint blends it smoothly with the facade
        ctx.filter = 'blur(15px)';
        
        // Draw the pure white mask box (standard inpainting area to be generated)
        ctx.fillStyle = "#FFFFFF";
        
        // We expand the drawing box slightly to compensate for the blur shrinking the solid area
        const expansion = 15;
        ctx.fillRect(-drawWidth / 2 - expansion, -drawHeight / 2 - expansion, drawWidth + expansion*2, drawHeight + expansion*2);
        
        ctx.restore();

        return canvas.toDataURL('image/png');
    }, [maskBox]);

    // Handlers for manual drawing of the box
    const handlePointerDown = (e) => {
        // Only start drawing if clicking directly on the canvas background, not on the existing box handles
        if (e.target.classList.contains('canvas-wrap') || e.target.classList.contains('canvas-positioner') || e.target.classList.contains('mask-canvas')) {
            e.preventDefault();
            isDrawing.current = true;
            
            const rect = maskCanvasRef.current.getBoundingClientRect();
            const clientX = e.clientX || e.touches?.[0]?.clientX;
            const clientY = e.clientY || e.touches?.[0]?.clientY;
            
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            
            startPoint.current = { x, y };
            
            // Initialize a tiny box that will grow as they drag
            setMaskBox({
                id: 'manual-mask-' + Date.now(),
                x,
                y,
                width: 0,
                height: 0,
                rotation: 0
            });
        }
    };

    const handlePointerMove = (e) => {
        if (!isDrawing.current || !maskBox || !maskCanvasRef.current) return;
        
        const rect = maskCanvasRef.current.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;
        
        const startX = startPoint.current.x;
        const startY = startPoint.current.y;

        const newX = Math.min(startX, currentX);
        const newY = Math.min(startY, currentY);
        const newWidth = Math.abs(currentX - startX);
        const newHeight = Math.abs(currentY - startY);

        setMaskBox(prev => ({
            ...prev,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
        }));
    };

    const handlePointerUp = () => {
        if (isDrawing.current) {
            isDrawing.current = false;
            // Clean up if they just clicked without dragging
            setMaskBox(prev => {
                if (prev && prev.width < 10 && prev.height < 10) {
                    return null;
                }
                return prev;
            });
        }
    };

    return {
        maskCanvasRef,
        maskBox,
        updateMaskBox,
        setMaskBoxFromAI,
        clearMask,
        bakeMask,
        handlers: {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerLeave: handlePointerUp,
            // Prevent default drag behaviors from interfering with our custom pointer logic
            onDragStart: (e) => e.preventDefault(),
        }
    };
}
