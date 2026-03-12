import { useState, useRef, useCallback } from 'react';
import { Wand2, ChevronRight, RotateCcw, AlertCircle, Layers, Zap, X, Menu, PanelLeftClose } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import AutoMaskCanvas from './components/AutoMaskCanvas';
import { CatalogSelector } from './components/CatalogSelector';
import { LoadingOverlay } from './components/LoadingOverlay';
import { RenderResult } from './components/RenderResult';
import { stripDataUrlPrefix } from './utils/imageUtils';
import './App.css';

// ── Config ────────────────────────────────────────────────────────────────────
// URL del webhook de n8n — configura en .env.local con VITE_N8N_WEBHOOK_URL
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// App steps
const STEPS = ['upload', 'workspace', 'result'];

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState('upload');
  const [imageData, setImageData] = useState(null);
  
  // Selection
  const [selectedType, setSelectedType] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  
  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // App logic
  const [isLoading, setIsLoading] = useState(false);
  const [loadStage, setLoadStage] = useState('uploading');
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);

  const maskRef = useRef(null); // ref to MaskCanvas

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleImageLoaded = useCallback((data) => {
    setImageData(data);
    setError(null);
    setStep('workspace');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedType || !selectedModel || !selectedColor) {
      setError('Selecciona la categoría, el modelo y el color del toldo.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const maskBase64 = await maskRef.current.getMaskBase64();
    const promptValue = maskRef.current.getPrompt() || "";
    const imageBase64 = imageData?.base64;

    if (!imageBase64) {
      setIsLoading(false);
      setError('Error interno: falta imagen. Vuelve a empezar.');
      return;
    }

    // Instead of raw image, we bake the red box onto the base64 string directly 
    // This perfectly bypasses CORS exceptions while properly handling rotation and placement
    const imagenB64 = (await maskRef.current?.getImageWithRedBox?.()) || imageBase64;
    
    // We send mask only if user drew one or auto-detected it. Might be empty if they didn't.
    const mascaraB64 = maskBase64 || "";

    // ── Build the payload ─────────────────────────────────
    // Using Flux Kontext Pro for scene EDITING (not inpainting).
    // This model understands "add X to the scene" instructions much better than inpainting models.
    
    // Convert the drawn box coordinates to semantic text placement and CAMBER/ANGLE logic
    let placementInstruction = "mounted on the wall";
    let angleInstruction = "viewed from a neutral straight-on angle";
    const maskBox = maskRef.current?.getMaskBox?.();
    if (maskBox && maskBox.containerWidth && maskBox.containerHeight) {
      const centerX = maskBox.x + (maskBox.width / 2);
      const centerY = maskBox.y + (maskBox.height / 2);
      
      const xPos = centerX < maskBox.containerWidth / 3 ? "left" : centerX > (maskBox.containerWidth * 2) / 3 ? "right" : "center";
      const yPos = centerY < maskBox.containerHeight / 3 ? "top" : centerY > (maskBox.containerHeight * 2) / 3 ? "bottom" : "middle";
      
      placementInstruction = `mounted specifically on the ${yPos} ${xPos} area of the facade`;
      
      // Infer camera perspective based on where the awning is placed vertically
      // If awning is at the very top, camera is likely looking up from below.
      // If awning is at the very bottom, camera is likely looking down from above.
      if (yPos === "top") angleInstruction = "viewed from below looking slightly up, revealing only the clean underside fabric of the awning; retractable arms and mounting brackets are partially visible but tucked against the wall";
      else if (yPos === "bottom") angleInstruction = "viewed from above looking down, showing ONLY the top fabric/canvas surface of the awning. The retractable arms, lateral support bars and all mechanical components MUST NOT be visible from this top-down angle — they are completely hidden underneath the canvas fabric";
      else angleInstruction = "viewed straight on from a level eye-height perspective, showing the front profile of the awning with arms folded neatly parallel to the wall";
    }

    const colorDesc = selectedColor.hex
      ? `${selectedColor.label} (hex ${selectedColor.hex}) colored`
      : 'classic white and blue striped';
    const technicalPrompt =
      `Generate a photorealistic architectural visualization. Add a ${selectedType.prompt}. ` +
      `${selectedColor.prompt}. ` +
      `The awning is ${placementInstruction} and extends outward, casting a soft realistic shadow below it. ` +
      `Camera perspective: ${angleInstruction}. ` +
      `CRITICAL INSTRUCTION: You MUST strictly follow the structural description and the provided reference image. ` +
      `Place the awning EXACTLY where the thick RED RECTANGULAR OUTLINE is drawn on the original image, covering that red outline seamlessly. ` +
      `Keep the rest of the building, roof, furniture, plants, tiles and all other elements EXACTLY unchanged. ` +
      `Photorealistic architectural photography, 8k uhd, natural lighting.`;
    const finalPrompt = promptValue 
        ? `${technicalPrompt} User note: ${promptValue}` 
        : technicalPrompt;

    // Convert the local stock model image to a Base64 Data URI
    // Flux 2 Pro accepts base64 data URIs for reference images, which is needed for localhost.
    let stockImageBase64 = '';
    try {
      const imgFetchOptions = { cache: 'no-store' }; 
      const imgRes = await fetch(selectedModel.imageUrl, imgFetchOptions);
      const imgBlob = await imgRes.blob();
      stockImageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imgBlob);
      });
    } catch (e) {
      setIsLoading(false);
      setError('Error al cargar la imagen del catálogo: ' + e.message);
      return;
    }

    // Fal.ai requires valid Base64 Data URIs for images, it strictly rejects empty strings. 
    // If no mask is provided, we should gracefully fail before hitting the API, or in an advanced implementation send a generated dummy mask. 
    // For now, we ensure we only send to API if maskB64 is truly available.
    if (!mascaraB64) {
      setIsLoading(false);
      setError('Por favor dibuja o auto-detecta la zona del toldo (máscara) antes de generar.');
      return;
    }

    // Capture exact mathematical coordinates dynamically for N8N Server-Side Processing
    // We scale the DOM coordinates back to the original image coordinates
    let boxCoordinates = null;
    const rawBox = maskRef.current?.getRawBox?.();
    if (rawBox && maskBox && maskBox.containerWidth) {
       // Using an assumed natural width/height if we don't have it directly.
       // The containerWidth is the visual DOM size. We send the raw pixel coordinates relative to the DOM
       // and N8N can calculate the relative percentage.
       boxCoordinates = {
          x: rawBox.x,
          y: rawBox.y,
          width: rawBox.width,
          height: rawBox.height,
          start_x: rawBox.x,
          end_x: rawBox.x + rawBox.width,
          start_y: rawBox.y,
          end_y: rawBox.y + rawBox.height,
          containerWidth: maskBox.containerWidth,
          containerHeight: maskBox.containerHeight
       };
    }

    const payload = {
      imagen: imagenB64.includes(',') ? imagenB64.split(',')[1] : imagenB64,
      mascara: mascaraB64.includes(',') ? mascaraB64.split(',')[1] : mascaraB64,
      box_coordinates: boxCoordinates,
      prompt: finalPrompt,
      category: selectedType.label,
      stockImageUrl: stockImageBase64 ? stockImageBase64 : null,
      image_urls: selectedModel?.imageUrl ? [imagenB64, selectedModel.imageUrl] : [imagenB64],
      colorHex: selectedColor.hex || "striped",
      negative_prompt: "valance, hanging fabric, drop-down edge, draped cloth, scallop edge, skirt, fringes, bulky cassette, thick mounting base, heavy aluminum box, large structure",
    };

    // ── Debug console ───────
    const imagenKB = Math.round(imagenB64.length / 1024);
    const mascaraKB = Math.round(mascaraB64.length / 1024);
    const totalKB = Math.round(JSON.stringify(payload).length / 1024);
    console.group('[ToldosAI] Generando render');
    console.log('URL webhook:', N8N_WEBHOOK_URL);
    console.log(`Tamaño imagen:  ${imagenKB} KB`);
    console.log(`Payload total:  ${totalKB} KB`);
    console.log('Prompt Text:', payload.prompt);
    console.log('Stock Model Input:', payload.stockImageUrl);
    console.groupEnd();

    // AbortController — 120 s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      setLoadStage('uploading');
      await sleep(300);
      setLoadStage('segmenting');

      console.log('[ToldosAI] Enviando fetch a:', N8N_WEBHOOK_URL);
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: 'omit',
      });

      setLoadStage('generating');

      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch { /* ignore */ }
        throw new Error(`Error n8n ${res.status}: ${res.statusText}. ${detail}`);
      }

      setLoadStage('finalizing');
      await sleep(400);

      const contentType = res.headers.get('content-type') || '';
      
      // Manejo optimizado: Si N8N envía la imagen en formato Binario directo
      if (contentType.includes('image/')) {
        const blob = await res.blob();
        setResultUrl(URL.createObjectURL(blob));
      } else {
        // Manejo Legacy: N8N envió un JSON con base64 adentro
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error('La respuesta de n8n no es una imagen binaria ni un JSON válido.');
        }

        const url = data.render_url || data.url || data.image_url;
        if (url) {
          setResultUrl(url);
        } else if (data.image) {
          // 1. Convert to string and strip data URI prefixes just in case
          let cleanBase64 = String(data.image);
          if (cleanBase64.includes(',')) {
            cleanBase64 = cleanBase64.split(',')[1];
          }
          // 2. Remove any whitespace, newlines or non-base64 characters
          cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, "");
          
          // 3. Render directly in the browser via data URI
          setResultUrl(`data:image/jpeg;base64,${cleanBase64}`);
        } else {
          throw new Error(`Respuesta JSON sin imagen útil. Recibido: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      }

      setStep('result');
    } catch (err) {
      console.error('[Generate]', err);
      setError(err.message);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [imageData, selectedType, selectedModel, selectedColor]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setImageData(null);
    setSelectedType(null);
    setSelectedModel(null);
    setSelectedColor(null);
    setResultUrl(null);
    setError(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-inner">
          <div className="logo">
            <Layers size={26} className="logo-icon" />
            <span className="logo-text">Toldos<span className="logo-accent">AI</span></span>
          </div>
          <div className="header-badge">
            <Zap size={12} fill="currentColor" /> Beta
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Hero */}
        {step === 'upload' && (
          <div className="hero fade-in-up">
            <div className="hero-tag">🤖 Powered by Fal.ai</div>
            <h1 className="hero-title">
              Visualiza el toldo perfecto
              <br />
              <span className="gradient-text">en tu fachada, con IA</span>
            </h1>
            <p className="hero-sub">
              Sube una foto, ajusta la posición del toldo y configúralo.<br />
              La IA genera un render fotorrealista en segundos.
            </p>
          </div>
        )}

        {/* Step indicator */}
        {step !== 'upload' && step !== 'result' && !isLoading && (
          <StepIndicator currentStep={step} />
        )}

        {/* Content */}
        <div className="app-content">
          {/* Step: Upload */}
          {step === 'upload' && (
            <ImageUploader onImageLoaded={handleImageLoaded} />
          )}

          {/* Step: Workspace (Mask + Catalog) */}
          {step === 'workspace' && imageData && (
            <div className="step-section">
              <div className="workspace-layout">
                {/* Left side: Image and Masking */}
                <div className="workspace-main">
                  <div className="step-header">
                    <div>
                      <h2 className="step-title">1. Prepara la fachada</h2>
                      <p className="step-desc">Indica en la caja de abajo dónde instalar el toldo.</p>
                    </div>
                  </div>
                  
                  <div className="canvas-and-models-container">
                    <AutoMaskCanvas ref={maskRef} imageUrl={imageData.url} imageBase64={imageData.base64} />
                    
                    {/* Botón Flotante para Móviles (abre el Drawer) */}
                    <button 
                      className="floating-action-btn"
                      onClick={() => setIsDrawerOpen(true)}
                    >
                      <Menu size={20} />
                      <span>Elegir Toldo</span>
                    </button>
                  </div>
                </div>

                {/* Right side: Catalog Selection / Mobile Drawer */}
                <div className={`workspace-sidebar drawer-panel ${isDrawerOpen ? 'open' : ''}`}>
                  <div className="drawer-header">
                    <div>
                      <h2 className="step-title">2. Configura el Toldo</h2>
                      <p className="step-desc">Elige modelo y color para la IA.</p>
                    </div>
                    <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>
                      <X size={24} />
                    </button>
                  </div>

                  <div className="drawer-content">
                    <CatalogSelector
                      selectedType={selectedType}
                      selectedModel={selectedModel}
                      selectedColor={selectedColor}
                      onTypeChange={setSelectedType}
                      onModelChange={setSelectedModel}
                      onColorChange={setSelectedColor}
                    />

                    {/* Draggable Models Strip moved INSIDE the Drawer */}
                    {selectedType && selectedType.models && (
                        <div className="drawer-models-grid fade-in-up">
                          <p className="drawer-models-title">Selecciona un modelo 👇</p>
                          <div className="drawer-models-list">
                              {selectedType.models.map(m => (
                                <div
                                  key={m.id}
                                  className={`drawer-model-thumb ${selectedModel?.id === m.id ? 'active' : ''}`}
                                  onClick={() => setSelectedModel(m)}
                                >
                                  <img src={m.imageUrl} alt={m.label} draggable="false" />
                                  <span className="model-thumb-label">{m.label}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                    )}
                    
                    {error && <div style={{ marginTop: '16px' }}><ErrorBanner msg={error} /></div>}
                    
                    <div className="step-actions" style={{ marginTop: '24px' }}>
                      <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1 }}>
                        <RotateCcw size={16} /> Cambiar foto
                      </button>
                      <button
                        className="btn btn-success generate-btn"
                        onClick={() => {
                          setIsDrawerOpen(false);
                          handleGenerate();
                        }}
                        disabled={!selectedType || !selectedModel || !selectedColor}
                        id="btn-generate-render"
                        style={{ flex: 1, padding: '12px 16px' }}
                      >
                        <Wand2 size={16} /> Generar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dark overlay behind drawer on mobile */}
                {isDrawerOpen && (
                  <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && <LoadingOverlay stage={loadStage} />}

          {/* Result */}
          {step === 'result' && resultUrl && !isLoading && (
            <RenderResult
              resultUrl={resultUrl}
              originalUrl={imageData.url}
              config={{ type: selectedType, color: selectedColor }}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>ToldosAI · Generación de renders con IA · <a href="https://fal.ai" target="_blank" rel="noopener noreferrer">Fal.ai</a> + n8n</p>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  const steps = [
    { key: 'workspace', label: 'Diseño' },
    { key: 'result', label: 'Render' },
  ];
  const currentIdx = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="step-indicator fade-in-up">
      {steps.map((s, i) => (
        <div key={s.key} className={`step-dot-wrap ${i <= currentIdx ? 'active' : ''}`}>
          <div className="step-dot">{i + 1}</div>
          <span className="step-dot-label">{s.label}</span>
          {i < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div className="error-banner fade-in-up">
      <AlertCircle size={16} />
      <span>{msg}</span>
    </div>
  );
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
