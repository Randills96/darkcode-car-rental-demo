import sharp from "sharp";

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 70;
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export function isAllowedImageMimeType(mimeType?: string | null, fileName?: string | null) {
  if (mimeType && ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true;
  }
  if (fileName) {
    return /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(fileName);
  }
  return false;
}

export async function compressDocumentImage(input: Buffer) {
  if (input.byteLength > MAX_INPUT_BYTES) {
    throw new Error("Image is too large. Maximum upload size is 30 MB.");
  }

  const output = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: "4:2:0",
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    mimeType: "image/jpeg" as const,
    extension: "jpg" as const,
    width: output.info.width,
    height: output.info.height,
    sizeBytes: output.data.byteLength,
  };
}
