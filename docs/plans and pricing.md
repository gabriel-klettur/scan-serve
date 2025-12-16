
# Planes y precios

Scan&Serve ofrece tres niveles pensados para distintos tipos de clientes: usuarios que solo quieren probar/estudiar, negocios pequeños que necesitan una solución económica y empresas que requieren lectura completa, alta fiabilidad y soporte.

## Resumen de planes

| Plan | Para quién | Lectura del ticket | Límite | IA | Precio |
| --- | --- | --- | --- | --- | --- |
| **Free (Educativo)** | Estudiantes, prototipos, proyectos educativos | Parcial (método tradicional) | 10 usos/día (IA) | Modelos “antiguos”/económicos (p.ej. 3.5 o 4o, según disponibilidad) | **$0** |
| **Base ($5)** | Usuarios y negocios pequeños con volumen moderado | Completa (OCR Google) | 500 escaneos incluidos (base) | IA para estructurar y corregir | **$5 / 500 escaneos** + variable |
| **Enterprise** | Empresas: restaurantes, bares, hoteles, cadenas, integraciones | Completa + validación | A medida | IA + flujos de control de calidad | **Cotización** |

## Plan Free (Educativo)

Este plan existe para que puedas usar Scan&Serve como **proyecto educativo**.

- **Objetivo**
  - Aprender y experimentar con extracción de datos sin depender de OCR de pago.
  - Contribuir a un enfoque “educativo” donde buscamos convertir el lector OCR con **EasyOCR** en una alternativa útil para casos de aprendizaje.
- **Cómo funciona**
  - Usamos un **método tradicional** de extracción que obtiene **solo una parte del ticket** (por ejemplo, campos básicos o una sección limitada), para reducir coste y complejidad.
- **Límites**
  - **10 usos diarios de IA** en el plan gratuito.
  - Modelos de IA “antiguos”/económicos (por ejemplo, 3.5 o 4o) con fin educativo y sujeto a disponibilidad.
- **Para quién es ideal**
  - Personas que quieren entender el flujo (subir imagen → extraer texto parcial → estructurar) sin necesidad de cobertura completa.

## Plan Base ($5): OCR de Google + costes variables

Este plan está pensado para quien necesita **lectura completa** y resultados consistentes sin entrar todavía en un contrato empresarial.

- **Costo base de OCR**
  - El lector **OCR de Google** tiene un coste de **$5 por 500 escaneos**.
- **Costes adicionales mensuales (variable)**
  - Además del coste base, puede existir un coste adicional por escaneo mensual que **depende del tamaño del ticket**.
  - En la práctica, “tamaño” significa cuánto texto extrae el OCR y cuántos **tokens** (unidad de texto procesable por modelos de IA) se consumen al:
    - Interpretar líneas, totales e impuestos.
    - Corregir errores del OCR.
    - Estandarizar nombres de productos/categorías.

### ¿Qué incluye?

- **Lectura completa** del ticket mediante OCR de Google.
- **Estructuración** (por ejemplo: comercio, fecha, ítems, total, impuestos).
- **Corrección asistida por IA** para mejorar calidad cuando el OCR trae ruido.

### ¿Cuándo sube el coste variable?

- Tickets muy largos.
- Tickets con tipografías difíciles, baja iluminación o movimiento.
- Idiomas mixtos, abreviaturas o formatos poco estándar.

## Plan Enterprise (Empresas)

Diseñado para empresas (restaurantes, bares, hoteles y organizaciones con operación diaria) que requieren **lectura completa**, **alto nivel de confianza** y **soporte**.

- **Propuesta de valor**
  - Lectura completa + proceso de **corrección con IA** para “paliar” problemas típicos de OCR (sombras, inclinación, ruido, etc.).
  - Objetivo de fiabilidad: **95%** como estándar operativo, con mejora progresiva hacia un rango **95%–100%** según el caso de uso, calidad de imágenes y calibración.
- **Qué significa “95% de fiabilidad”**
  - Un enfoque de **control de calidad** (quality control) donde combinamos:
    - OCR robusto.
    - Normalización y validación (por ejemplo: totales vs suma de ítems).
    - Reintentos y heurísticas.
    - Corrección por IA con reglas de negocio.
- **Ideal para**
  - Integraciones con POS/ERP.
  - Reportería, contabilidad, auditoría y control de gastos.
  - Equipos con varios usuarios y necesidades de permisos.

## Notas importantes

- **“Escaneo”** se refiere a procesar una imagen de ticket (o una página) a través del OCR.
- Los costes variables dependen del texto real procesado y de la complejidad del contenido.
- Si tu caso requiere SLA, integraciones o volumen alto, **Enterprise** es el camino recomendado.

