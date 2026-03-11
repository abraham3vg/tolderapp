import { useRef, useState, useCallback } from 'react';
import { UploadCloud, Camera, X, ImagePlus } from 'lucide-react';
import { fileToBase64, resizeImage } from '../utils/imageUtils';
import './ImageUploader.css';

export function ImageUploader({ onImageLoaded }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileRef = useRef(null);
    const cameraRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const resized = await resizeImage(file, 1280, 1280);
        const base64 = await fileToBase64(resized);
        const url = URL.createObjectURL(resized);
        onImageLoaded({ base64, url, file: resized });
    }, [onImageLoaded]);

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="uploader-wrap fade-in-up">
            <div
                className={`drop-zone glass ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                aria-label="Cargar imagen de la fachada"
            >
                <div className="drop-icon">
                    <ImagePlus size={48} strokeWidth={1.3} />
                </div>
                <h2 className="drop-title">Arrastra la foto aquí</h2>
                <p className="drop-sub">o haz clic para seleccionar desde tu dispositivo</p>
                <div className="drop-actions">
                    <button
                        className="btn btn-primary"
                        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                        id="btn-upload-file"
                    >
                        <UploadCloud size={18} /> Subir foto
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                        id="btn-take-photo"
                    >
                        <Camera size={18} /> Tomar foto
                    </button>
                </div>
                <p className="drop-hint">JPG, PNG · Máx 10 MB · Tamaño ideal: HD (1920×1080)</p>
            </div>

            {/* Hidden inputs */}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
                id="file-input"
            />
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
                id="camera-input"
            />
        </div>
    );
}
