# 📋 Guía Fase 1 & 2 — Fal.ai + n8n + AWS S3

## FASE 1: Fal.ai + ComfyUI

### 1.1 Cuenta y API Key
1. Entra a [fal.ai](https://fal.ai) → **Sign Up**
2. Ve a **Settings → API Keys → Create Key**
3. Copia tu clave y guárdala como variable de entorno en n8n:
   - En n8n: **Settings → Variables → New** → `FAL_API_KEY = fal-xxxx`

### 1.2 Workflow ComfyUI
Instala ComfyUI localmente o usa el editor en la nube de Fal.ai.

**Nodos necesarios:**
| Nodo | Función |
|---|---|
| `LoadImage` | Carga la foto de la fachada (URL de S3) |
| `LoadImage` (Mask) | Carga la máscara en blanco/negro |
| `CLIPTextEncode` (Positive) | Prompt del toldo: textura, tipo, color |
| `CLIPTextEncode` (Negative) | `ugly, deformed, blurry, people, text...` |
| `ControlNetLoader (MLSD)` | Lee perspectiva de líneas rectas |
| `ControlNetApply` | Aplica ControlNet sobre el denoising |
| `IPAdapterApply` | Inyecta textura del catálogo |
| `SDXL InpaintConditioning` | Fuerza el pintado solo en el área de la máscara |
| `KSampler` | Genera el render final |
| `VAEDecode` | Convierte latent → imagen |
| `SaveImage` | Devuelve la imagen final |

### 1.3 Exportar formato API
1. En ComfyUI → menú superior → **"Save (API Format)"**
2. Guarda el JSON resultante en `comfyui/workflow_toldos_api.json`
3. Identifica los nodos donde van las URLs de imagen y máscara:
   - Busca `"LoadImage"` → anota el `node_id`
   - Esos son los que n8n reemplazará dinámicamente

### 1.4 Prueba manual
```bash
curl -X POST https://queue.fal.run/fal-ai/any-comfy \
  -H "Authorization: Key TU_FAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d @comfyui/workflow_toldos_api.json
```

---

## FASE 2: n8n + AWS S3

### 2.1 AWS S3 — Configurar bucket
1. Ve a [AWS Console](https://s3.console.aws.amazon.com) → **Create Bucket**
   - Nombre: `toldos-ai-renders`
   - Región: `eu-west-1` (o la más cercana)
   - **Desactiva "Block all public access"** (para URLs temporales públicas)
2. **CORS:** Añade la siguiente política CORS al bucket:
```json
[{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"]
}]
```
3. Crea un usuario IAM con permisos `AmazonS3FullAccess` → genera Access Key + Secret

### 2.2 Importar flujo n8n
1. Abre tu instancia n8n
2. **Workflows → Import workflow** → selecciona `n8n/flujo_n8n_toldos.json`

### 2.3 Configurar credenciales
En n8n:
- **Credentials → New → AWS** → añade Access Key ID y Secret Key
- Asigna esas credenciales a los dos nodos S3 del flujo
- En **Settings → Variables**: añade:
  - `FAL_API_KEY` = `fal-xxxx`
  - `S3_BUCKET` = `toldos-ai-renders`

### 2.4 Integrar JSON de ComfyUI
En el nodo **"Fal.ai — Enviar a ComfyUI"**:
1. Toma el JSON exportado en el paso 1.3
2. Codifícalo en Base64:
```bash
# En PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("comfyui/workflow_toldos_api.json"))
```
3. Guarda ese Base64 en una variable n8n: `COMFYUI_WORKFLOW_JSON_B64`

### 2.5 Test de integración
```powershell
$body = @{
  image = [Convert]::ToBase64String([IO.File]::ReadAllBytes("foto_fachada.jpg"))
  mask  = [Convert]::ToBase64String([IO.File]::ReadAllBytes("mascara.png"))
  prompt = "retractable cassette awning, navy blue canvas fabric, photorealistic, 8k uhd"
  prompt_neg = "ugly, deformed, cartoon, people"
  awning_type = "cofre"
  color = "azul_marino"
} | ConvertTo-Json

Invoke-RestMethod -Method POST `
  -Uri "https://tu-n8n-instance.com/webhook/toldos" `
  -Body $body `
  -ContentType "application/json"
```

Respuesta esperada:
```json
{ "render_url": "https://toldos-ai-renders.s3.eu-west-1.amazonaws.com/output_xxx.jpg" }
```
