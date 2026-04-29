"use client";

import { useTransition } from "react";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setReunionHero } from "@/lib/actions/reunion";

interface HeroPhotoUploaderProps {
  reunionId: string;
  cloudName: string;
  apiKey: string;
}

function readUploadInfo(result: CloudinaryUploadWidgetResults):
  | {
      publicId: string;
      secureUrl: string;
    }
  | undefined {
  const info = result.info;
  if (!info || typeof info === "string") {
    return undefined;
  }

  if (typeof info.public_id !== "string" || typeof info.secure_url !== "string") {
    return undefined;
  }

  return {
    publicId: info.public_id,
    secureUrl: info.secure_url,
  };
}

export function HeroPhotoUploader({
  reunionId,
  cloudName,
  apiKey,
}: HeroPhotoUploaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const folder = `kincircle/${reunionId}/hero`;

  function handleSuccess(result: CloudinaryUploadWidgetResults) {
    const upload = readUploadInfo(result);
    if (!upload) {
      toast.error("Cloudinary returned an unexpected upload result");
      return;
    }

    startTransition(async () => {
      const saveResult = await setReunionHero({
        reunionId,
        publicId: upload.publicId,
        url: upload.secureUrl,
      });

      if ("error" in saveResult) {
        toast.error(saveResult.error);
        return;
      }

      toast.success("Hero photo updated");
      router.refresh();
    });
  }

  return (
    <CldUploadWidget
      config={{ cloud: { cloudName, apiKey } }}
      signatureEndpoint="/api/cloudinary/sign"
      options={{
        folder,
        sources: ["local", "camera", "url"],
        multiple: false,
        maxFiles: 1,
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        maxFileSize: 10_000_000,
        cropping: true,
        croppingAspectRatio: 16 / 9,
        showSkipCropButton: true,
        singleUploadAutoClose: true,
      }}
      onSuccess={handleSuccess}
      onError={() => toast.error("Upload failed")}
    >
      {({ open, isLoading }) => (
        <button
          type="button"
          className="btn sm border-white/30 bg-white/15 text-white shadow-none backdrop-blur hover:bg-white/25 hover:text-white"
          disabled={isLoading || isPending}
          onClick={() => open()}
        >
          {isLoading || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Change cover
        </button>
      )}
    </CldUploadWidget>
  );
}
