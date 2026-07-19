/**
 * Comprime e redimensiona uma imagem para no maximo maxSize px em qualquer
 * dimensao. Retorna um Blob JPEG para upload sem criar uma string Base64.
 */
export function compressImageBlob(
  file: File,
  maxSize = 1024,
  quality = 0.72,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);

      const { width, height } = image;
      let targetWidth = width;
      let targetHeight = height;
      if (targetWidth > maxSize || targetHeight > maxSize) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight * maxSize) / targetWidth);
          targetWidth = maxSize;
        } else {
          targetWidth = Math.round((targetWidth * maxSize) / targetHeight);
          targetHeight = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas indisponível para compressão."));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
      : reject(new Error("Não foi possível comprimir a imagem.")),
        "image/jpeg",
        quality,
      );
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(sourceUrl);
      reject(error);
    };
    image.src = sourceUrl;
  });
}
