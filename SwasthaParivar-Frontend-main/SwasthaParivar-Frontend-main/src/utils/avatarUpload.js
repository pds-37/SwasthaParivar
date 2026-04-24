const MAX_SOURCE_FILE_BYTES = 5 * 1024 * 1024;
const TARGET_AVATAR_BYTES = 350 * 1024;
const HARD_LIMIT_AVATAR_BYTES = 550 * 1024;
const MAX_DIMENSION = 512;
const MIN_DIMENSION = 220;
const START_QUALITY = 0.86;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;
const SCALE_STEP = 0.85;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = src;
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not process the selected image."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not finish preparing the image."));
    reader.readAsDataURL(blob);
  });

const fitDimensions = (width, height, maxDimension) => {
  if (!width || !height) {
    return { width: maxDimension, height: maxDimension };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));

  return {
    width: Math.max(MIN_DIMENSION, Math.round(width * scale)),
    height: Math.max(MIN_DIMENSION, Math.round(height * scale)),
  };
};

export const prepareAvatarUpload = async (file) => {
  if (!file) {
    throw new Error("Choose an image to upload.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("Please choose an image under 5MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not prepare the image.");
  }

  let { width, height } = fitDimensions(image.naturalWidth, image.naturalHeight, MAX_DIMENSION);
  let quality = START_QUALITY;
  let blob = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (blob.size <= TARGET_AVATAR_BYTES) {
      break;
    }

    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      continue;
    }

    width = Math.max(MIN_DIMENSION, Math.round(width * SCALE_STEP));
    height = Math.max(MIN_DIMENSION, Math.round(height * SCALE_STEP));
  }

  if (!blob || blob.size > HARD_LIMIT_AVATAR_BYTES) {
    throw new Error("Please choose a smaller or clearer image for the profile photo.");
  }

  return {
    dataUrl: await blobToDataUrl(blob),
    fileName: file.name,
    size: blob.size,
    mimeType: blob.type,
  };
};

export default prepareAvatarUpload;
