import Resizer from "react-image-file-resizer";
import * as PDFJS from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url"; // Vite

PDFJS.GlobalWorkerOptions.workerSrc = workerUrl;

export const readFileData = (
  file: File
): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const pdfToImage = async (
  file: File,
  page: number = 0
): Promise<{ pdf: string | ArrayBuffer; images: string[] }> => {
  try {
    const data = await readFileData(file);
    if (!data) throw new Error("No se obtuvo información del archivo.");

    const pdf = await PDFJS.getDocument(data).promise;
    const images: string[] = [];

    if (page === 0) {
      for (let i = 0; i < pdf.numPages; i++) {
        const canvas = document.createElement("canvas");
        try {
          const pdfPage = await pdf.getPage(i + 1);
          const viewport = pdfPage.getViewport({ scale: 1 });
          const context = canvas.getContext("2d");

          if (!context)
            throw new Error("No se pudo obtener el contexto 2D del canvas.");

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await pdfPage.render({ canvasContext: context, viewport }).promise;
          images.push(canvas.toDataURL());
        } finally {
          canvas.remove();
        }
      }
    } else {
      if (page > pdf.numPages) {
        throw new Error(
          `La página ${page} no existe. El PDF tiene ${pdf.numPages} páginas.`
        );
      }

      const canvas = document.createElement("canvas");
      try {
        const pdfPage = await pdf.getPage(page);
        const viewport = pdfPage.getViewport({ scale: 1 });
        const context = canvas.getContext("2d");

        if (!context)
          throw new Error("No se pudo obtener el contexto 2D del canvas.");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await pdfPage.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL());
      } finally {
        canvas.remove();
      }
    }
    return { pdf: data, images };
  } catch (error) {
    console.error("Error al convertir PDF a imagen:", error);
    throw error;
  }
};

export const resizeImage = (
  file: File,
  maxWidth = 300,
  format = "JPEG",
  quality = 100
) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      const originalWidth = img.width;
      const originalHeight = img.height;

      // Determinar si necesita redimensionarse
      const shouldResize = originalWidth > maxWidth;

      if (!shouldResize) {
        URL.revokeObjectURL(objectUrl);
        const data = await readFileData(file);
        resolve(data);
        return;
      }

      const aspectRatio = originalHeight / originalWidth;
      const targetWidth = maxWidth;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      URL.revokeObjectURL(objectUrl);

      Resizer.imageFileResizer(
        file,
        targetWidth,
        targetHeight,
        format,
        quality,
        0,
        (uri) => {
          resolve(uri);
        },
        "base64"
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Error al cargar la imagen"));
    };

    img.src = objectUrl;
  });
};

// const resizeBase64 = (base64Str: string, maxWidth = 600): Promise<string> => {
//   return new Promise((resolve) => {
//     const img = new Image();
//     img.src = base64Str;
//     img.onload = () => {
//       const canvas = document.createElement("canvas"),
//         ctx = canvas.getContext("2d");
//       const originalWidth = img.width;
//       const originalHeight = img.height;

//       const shouldResize = originalWidth > maxWidth;

//       if (!shouldResize) {
//         resolve(base64Str);
//         return;
//       }

//       const aspectRatio = originalHeight / originalWidth;
//       const targetWidth = maxWidth;
//       const targetHeight = Math.round(targetWidth * aspectRatio);

//       canvas.width = targetWidth;
//       canvas.height = targetHeight;
//       ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);
//       resolve(canvas.toDataURL());
//     };
//   });
// };
