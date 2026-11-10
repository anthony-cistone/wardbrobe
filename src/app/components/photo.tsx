/* eslint-disable @next/next/no-img-element -- signed storage URLs change hourly; plain img avoids re-optimizing them */
export function Photo({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  return (
    <span className={`block bg-photo overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-contain block" />
      ) : (
        <span className="w-full h-full flex items-center justify-center muted text-[12px]">No photo</span>
      )}
    </span>
  );
}
