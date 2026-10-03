# FaceSwap Clásico sin IA

Proyecto web simple para hacer FaceSwap usando OpenCV.js y detección facial clásica (Haar Cascade) junto con clonación de imagen (seamlessClone).

## Qué incluye
- index.html: interfaz con controles para subir imágenes y ajustar escala/rotación.
- style.css: estilos responsive.
- app.js: lógica de carga, detección y clonación (con mejoras: máscara elíptica, ajustes y botón de descarga).
- vercel.json: configuración mínima para deploy en Vercel.

## Problemas comunes y soluciones
- "Página no encontrada" en Vercel: asegúrate de que el proyecto esté en la rama `main` y que `index.html` esté en la raíz del repo (Vercel sirve `index.html` por defecto para proyectos estáticos).
- OpenCV tarda en cargar: espera unos segundos tras desplegar (OpenCV.js carga desde CDN). Si falla la cascada Haar, revisa la consola del navegador.

## Cómo desplegar en Vercel
1. Conecta el repositorio a Vercel y selecciona la rama `main`.
2. Tipo de proyecto: Static Site (no necesita build step).
3. Si usas algún framework, asegúrate de apuntar al directorio raíz.

## Mejoras posibles (próximos pasos)
- Permitir recorte manual de la región facial si la detección falla.
- Máscaras basadas en puntos faciales (landmarks) para mejor ajuste.
- Suavizado del color/tonalidad antes de clonar para resultados más naturales.
- Interfaz para comparar antes/después lado a lado y ajuste fino del blend.

## Licencia
MIT
