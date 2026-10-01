"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const CARD_RATIO = 85.6 / 53.98;

interface LicenceCardScannerProps {
  open: boolean;
  title: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}

function sourceRectForCover(
  video: HTMLVideoElement,
  videoRect: DOMRect,
  frameRect: DOMRect
) {
  const mediaRatio = video.videoWidth / video.videoHeight;
  const elementRatio = videoRect.width / videoRect.height;
  let renderedWidth = videoRect.width;
  let renderedHeight = videoRect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (mediaRatio > elementRatio) {
    renderedHeight = videoRect.height;
    renderedWidth = videoRect.height * mediaRatio;
    offsetX = (videoRect.width - renderedWidth) / 2;
  } else {
    renderedWidth = videoRect.width;
    renderedHeight = videoRect.width / mediaRatio;
    offsetY = (videoRect.height - renderedHeight) / 2;
  }

  const scaleX = video.videoWidth / renderedWidth;
  const scaleY = video.videoHeight / renderedHeight;
  return {
    sx: (frameRect.left - videoRect.left - offsetX) * scaleX,
    sy: (frameRect.top - videoRect.top - offsetY) * scaleY,
    sw: frameRect.width * scaleX,
    sh: frameRect.height * scaleY,
  };
}

export function LicenceCardScanner({ open, title, onCapture, onClose }: LicenceCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        return video.play().then(() => {
          if (!cancelled) setReady(true);
        });
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not open the camera. Allow camera access, or upload a photo instead.");
          onCloseRef.current();
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || !ready) return;

    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const { sx, sy, sw, sh } = sourceRectForCover(video, videoRect, frameRect);
    const cropW = Math.max(1, Math.round(sw));
    const cropH = Math.max(1, Math.round(sh));
    const scale = Math.max(1600 / cropW, 1000 / cropH, 1);
    const width = Math.round(cropW * scale);
    const height = Math.round(cropH * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Could not capture the licence photo");
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        onCapture(new File([blob], `driving-licence-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.95
    );
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium">{title}</p>
          <Button type="button" variant="secondary" size="icon" className="h-9 w-9 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div
            ref={frameRef}
            className="relative w-[min(92vw,560px)] rounded-xl"
            style={{ aspectRatio: String(CARD_RATIO) }}
          >
            <div className="pointer-events-none absolute inset-[-2400px] rounded-[inherit] shadow-[0_0_0_2400px_rgba(0,0,0,0.58)]" />
            <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-white/90" />
            <span className="pointer-events-none absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
            <span className="pointer-events-none absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />
          </div>
        </div>
        <div className="space-y-3 px-4 pb-8 pt-2 text-center">
          <p className="text-sm text-white/90">
            Fit the whole driving licence inside the white frame. Green corners mark the crop used for reading.
          </p>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full max-w-sm rounded-full text-base"
            onClick={capture}
            disabled={!ready}
          >
            <Camera className="mr-2 h-5 w-5" />
            {ready ? "Capture licence" : "Opening camera..."}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
