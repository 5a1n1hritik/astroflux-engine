'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

interface MediaBackgroundProps {
  videoUrl?: string;
  imageSrc?: string;
  imageAlt?: string;
  children?: ReactNode;
  className?: string;
  overlayClassName?: string;
}

/**
 * MediaBackground Component
 * Dynamically renders either a video or image as a fullscreen background.
 * Videos take priority if both are provided.
 * Maintains proper z-index layering: media → overlay → content
 */
export function MediaBackground({
  videoUrl,
  imageSrc,
  imageAlt = 'Background media',
  children,
  className = 'relative w-full h-[100dvh] overflow-hidden',
  overlayClassName = 'absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent',
}: MediaBackgroundProps) {
  return (
    <section className={className}>
      {/* Video Background - If provided */}
      {videoUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Image Background - Fallback if no video or image only */}
      {!videoUrl && imageSrc && (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
          quality={90}
        />
      )}

      {/* Overlay Gradient - Maintains text readability over media */}
      <div className={overlayClassName} />

      {/* Content Layer */}
      {children && <div className="relative z-10 h-full">{children}</div>}
    </section>
  );
}
