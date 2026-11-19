/** Achica una foto en el navegador (lado mayor 1600 px, JPEG): sube rápido con datos del celular y no pesa en la nube. */
export async function achicar(archivo: Blob): Promise<Blob> {
  const img = await createImageBitmap(archivo, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const e = Math.min(1, 1600 / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(img.width * e); lienzo.height = Math.round(img.height * e);
  lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  for (const q of [0.82, 0.7, 0.55]) {
    const b = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", q));
    if (b && b.size <= 1_400_000) return b;
  }
  throw new Error("Esa foto es demasiado grande. Prueba con otra.");
}
