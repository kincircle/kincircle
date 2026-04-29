import { v2 as cloudinary } from "cloudinary";

import {
  getCloudinaryApiKey,
  getCloudinaryApiSecret,
  getCloudinaryCloudName,
} from "@/lib/env";

export { cloudinary };

export type SignUploadInput = {
  folder: string;
};

function configureCloudinary() {
  const cloudName = getCloudinaryCloudName();
  const apiKey = getCloudinaryApiKey();
  const apiSecret = getCloudinaryApiSecret();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return { cloudName, apiKey, apiSecret };
}

export function signUploadParams({ folder }: SignUploadInput) {
  const { cloudName, apiKey, apiSecret } = configureCloudinary();
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  );

  return {
    timestamp,
    signature,
    folder,
    apiKey,
    cloudName,
  };
}

export async function deleteAsset(publicId: string) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId);
}
