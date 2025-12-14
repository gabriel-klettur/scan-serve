# Scan Serve

Este repositorio contiene el **frontend** de una app web de OCR ("ReceiptVision") construida con **Vite + React + TypeScript**.

La UI sube una imagen (recibo/ticket) a un API HTTP (`POST /ocr`) y muestra:

- Texto extraído
- Campos parseados (por ejemplo: total, fecha, comercio)
- Cajas delimitadoras (bounding boxes) con puntuación de confianza

## Estructura del proyecto

- `frontend/` — aplicación Vite/React (lo que corre en el navegador)
- `backend/` — actualmente vacío en este repo (el API de OCR debes ejecutarlo/proveerlo aparte)

## Frontend

### Stack

- Vite
- React + TypeScript
- Tailwind CSS + shadcn/ui
- React Router
- TanStack React Query
- Zustand

### Requisitos

- Node.js (recomendado 18+)
- npm

### Instalación

Desde la raíz del repo:

```bash
cd frontend
npm install
```

### Variables de entorno

El frontend lee la URL base del API desde:

- `VITE_API_URL` (opcional)

Si no la defines, usa por defecto: `http://localhost:8000`.

Crea por ejemplo `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

Notas:

- Vite solo expone al código del navegador variables con prefijo `VITE_`.

### Ejecutar en desarrollo

```bash
cd frontend
npm run dev
```

Por defecto el servidor de desarrollo corre en:

- `http://localhost:8080`

(Config en `frontend/vite.config.ts`.)

### Build de producción

```bash
cd frontend
npm run build
```

### Previsualizar el build

```bash
cd frontend
npm run preview
```

### Lint

```bash
cd frontend
npm run lint
```

## Contrato esperado del API de OCR

El frontend espera un API HTTP con:

- `POST /ocr`
- `Content-Type: multipart/form-data`
- Campo del form: `file` (la imagen subida)

El tipo esperado está definido en `frontend/src/types/ocr.ts`:

- `original_image_url`: string
- `processed_image_url`: string
- `text_raw`: string
- `confidence_avg`: number
- `fields`: `{ total?: number; date?: string; merchant?: string }`
- `boxes`: array de `{ text: string; bbox: number[][]; confidence: number }`
