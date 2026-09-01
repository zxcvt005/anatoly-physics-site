'use client';

import Image from 'next/image';
import { useState } from 'react';

type SummerSchoolPrizeImageProps = {
  src: string;
  alt: string;
  label: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function SummerSchoolPrizeImage({
  src,
  alt,
  label,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 520px',
  priority = false,
}: SummerSchoolPrizeImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 ${className}`}
    >
      {!failed && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-4 sm:p-6"
          onError={() => setFailed(true)}
        />
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#3166F0]/10 via-zinc-950 to-black px-6 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3166F0]/25 bg-[#3166F0]/10"
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect
                x="4"
                y="6"
                width="20"
                height="16"
                rx="3"
                stroke="#3166F0"
                strokeWidth="1.5"
              />
              <circle cx="10" cy="12" r="2" stroke="#3166F0" strokeWidth="1.5" />
              <path
                d="M7 19L12.5 14.5L16 17.5L19.5 13L24 18"
                stroke="#3166F0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">{label}</p>
          <p className="max-w-[16rem] text-xs leading-relaxed text-zinc-500">
            Фото появится здесь, когда файл будет добавлен
          </p>
        </div>
      )}
    </div>
  );
}
