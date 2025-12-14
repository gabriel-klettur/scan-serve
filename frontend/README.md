# Frontend (ReceiptVision)

Frontend web para OCR de recibos/tickets, construido con **Vite + React + TypeScript**.

- Dev server: `http://localhost:8080`
- API OCR (por defecto): `http://localhost:8000`

## Requisitos

- Node.js (recomendado 18+)
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

El cliente usa `VITE_API_URL` para apuntar al backend.

Crea un archivo `.env.local` en esta carpeta (`frontend/.env.local`):

```bash
VITE_API_URL=http://localhost:8000
```

Si no existe, el valor por defecto es `http://localhost:8000`.

## Scripts

- `npm run dev` — levanta el servidor de desarrollo (Vite)
- `npm run build` — genera el build de producción
- `npm run preview` — previsualiza el build
- `npm run lint` — ejecuta ESLint

## Ejecutar en desarrollo

```bash
npm run dev
```

## Contrato esperado del API (`POST /ocr`)

El frontend sube un archivo de imagen como `multipart/form-data` usando el campo `file`.

- Endpoint: `POST /ocr`
- Campo: `file`

Respuesta esperada (ver `src/types/ocr.ts`):

- `original_image_url`: string
- `processed_image_url`: string
- `text_raw`: string
- `confidence_avg`: number
- `fields`: `{ total?: number; date?: string; merchant?: string }`
- `boxes`: `[{ text, bbox, confidence }]`

## Troubleshooting

- Si ves errores CORS, configúralo en tu backend para permitir requests desde `http://localhost:8080`.
- Si la UI no puede conectar al API, revisa `VITE_API_URL` y que el backend esté escuchando en la URL/puerto correctos.
