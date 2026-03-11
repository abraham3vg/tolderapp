/**
 * imageUtils.js — Helpers for canvas, Base64 and blob operations
 */

/** Convert a File or Blob to a Base64 string (data URL) */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // includes data:image/...;base64, prefix
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Strip the data URL prefix and return only the raw Base64 string */
export function stripDataUrlPrefix(dataUrl) {
    return dataUrl.split(',')[1] || dataUrl;
}

/** Draw an HTMLImageElement onto a canvas and return its Base64 data URL */
export function imageToBase64(imgElement, mimeType = 'image/jpeg', quality = 0.92) {
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);
    return canvas.toDataURL(mimeType, quality);
}

/**
 * Convert a mask canvas (binary green mask) to a pure black/white PNG Base64
 * that ComfyUI / Fal.ai can use as inpainting mask.
 * White pixels = inpaint area, Black = keep.
 */
export function maskCanvasToBase64(maskCanvas) {
    const offscreen = document.createElement('canvas');
    offscreen.width = maskCanvas.width;
    offscreen.height = maskCanvas.height;
    const ctx = offscreen.getContext('2d');
    const srcCtx = maskCanvas.getContext('2d');

    const { data } = srcCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outImageData = ctx.createImageData(maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < data.length; i += 4) {
        // green channel dominant → white (mask), else black
        const isGreen = data[i + 1] > 100 && data[i] < 100 && data[i + 2] < 100;
        const val = isGreen ? 255 : 0;
        outImageData.data[i] = val;
        outImageData.data[i + 1] = val;
        outImageData.data[i + 2] = val;
        outImageData.data[i + 3] = 255;
    }

    ctx.putImageData(outImageData, 0, 0);
    return offscreen.toDataURL('image/png');
}

/** Resize an image File to maxWidth×maxHeight while preserving aspect ratio */
export function resizeImage(file, maxWidth = 1024, maxHeight = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
        };
        img.src = url;
    });
}

/** Get pixel coordinates relative to an element from a mouse/touch event */
export function getRelativeCoords(event, element) {
    const rect = element.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
        x: ((clientX - rect.left) / rect.width) * element.width,
        y: ((clientY - rect.top) / rect.height) * element.height,
    };
}
