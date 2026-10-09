export async function compressImage(file: File, maxSizeKB: number = 250, onProgress?: (percent: number) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    // Only compress images
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    if (onProgress) onProgress(10);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (onProgress) onProgress(30);
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        if (onProgress) onProgress(50);
        const canvas = document.createElement("canvas");
        
        // Scale down large images (max 1200px width/height)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        
        // Fill white background in case it's a transparent PNG being converted to JPEG
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const targetSize = maxSizeKB * 1024;
        let currentPercent = 60;

        const attemptCompression = () => {
          if (onProgress) onProgress(currentPercent);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              
              // If it's small enough or we hit minimum quality, return it
              if (blob.size <= targetSize || quality <= 0.4) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                if (onProgress) onProgress(90);
                resolve(compressedFile);
              } else {
                // Otherwise reduce quality and try again
                quality -= 0.15;
                currentPercent = Math.min(85, currentPercent + 5);
                attemptCompression();
              }
            },
            "image/jpeg",
            quality
          );
        };
        
        attemptCompression();
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
