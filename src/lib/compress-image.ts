/**
 * Comprime e redimensiona uma imagem para no máximo maxSize px em
 * qualquer dimensão, exportando como JPEG com a qualidade especificada.
 * Retorna uma string base64 (data URL).
 */
export function compressImage(
  file: File,
  maxSize = 1024,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        let w = width;
        let h = height;
        if (w > maxSize || h > maxSize) {
          if (w >= h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas ctx unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
