/* eslint-disable @next/next/no-img-element -- signed and local image URLs are not a static Next image host */

const FRAME = {
  vote: 'h-[min(42vh,20rem)] sm:h-72',
  gallery: 'h-52 sm:h-60',
  preview: 'h-56 sm:h-64',
  showcase: 'h-52',
  featured: 'h-64 sm:h-80',
  admin: 'h-48',
} as const;

export function MemeFitImage({
  src,
  alt,
  frame,
}: {
  src: string;
  alt: string;
  frame: keyof typeof FRAME;
}) {
  return (
    <div className={`flex w-full items-center justify-center bg-zinc-900 ${FRAME[frame]}`}>
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}
