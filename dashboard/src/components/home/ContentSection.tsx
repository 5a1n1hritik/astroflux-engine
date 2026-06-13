// 'use client';

// import { ArrowRight } from 'lucide-react';

// interface ContentSectionProps {
//   title: string;
//   description: string;
//   imageUrl: string;
//   imageAlt: string;
//   buttonText?: string;
//   isReversed?: boolean;
// }

// export function ContentSection({
//   title,
//   description,
//   imageUrl,
//   imageAlt,
//   buttonText = 'EXPLORE',
//   isReversed = false,
// }: ContentSectionProps) {
//   return (
//     <section
//       className="w-full min-h-screen bg-cover bg-center bg-no-repeat flex items-center relative overflow-hidden"
//       style={{
//         backgroundImage: `url(${imageUrl})`,
//       }}
//     >
//       {/* Dark overlay for better text readability */}
//       <div className="absolute inset-0 bg-black/30" />

//       {/* Text Content - Positioned left or right */}
//       <div
//         className={`relative z-10 max-w-2xl mx-auto px-6 md:px-12 ${
//           isReversed ? 'ml-auto mr-12 md:mr-20' : 'ml-12 md:ml-20 mr-auto'
//         }`}
//       >
//         <div className="flex flex-col gap-6">
//           <h2 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-balance">
//             {title}
//           </h2>
//           <p className="text-white/80 text-base md:text-lg font-light leading-relaxed max-w-xl">
//             {description}
//           </p>
//           <div className="pt-4">
//             <button className="group flex items-center gap-3 border border-white/40 px-6 py-3 hover:border-white hover:bg-white/10 transition-all duration-300">
//               <span className="text-white text-sm font-light tracking-wide uppercase">
//                 {buttonText}
//               </span>
//               <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
//             </button>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }


'use client';

import { ArrowRight } from 'lucide-react';
import { MediaBackground } from './MediaBackground';

interface ContentSectionProps {
  title: string;
  description: string;
  videoUrl?: string;
  imageSrc?: string;
  imageAlt?: string;
  buttonText?: string;
  isReversed?: boolean;
}

export function ContentSection({
  title,
  description,
  videoUrl,
  imageSrc,
  imageAlt = 'Section background',
  buttonText = 'EXPLORE',
  isReversed = false,
}: ContentSectionProps) {
  return (
    <MediaBackground
      videoUrl={videoUrl}
      imageSrc={imageSrc}
      imageAlt={imageAlt}
      className="relative w-full min-h-screen overflow-hidden flex items-center"
      overlayClassName="absolute inset-0 bg-black/30"
    >
      {/* Text Content - Positioned left or right */}
      <div
        className={`relative z-10 max-w-2xl mx-auto px-6 md:px-12 ${
          isReversed ? 'ml-auto mr-12 md:mr-20' : 'ml-12 md:ml-20 mr-auto'
        }`}
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-balance">
            {title}
          </h2>
          <p className="text-white/80 text-base md:text-lg font-light leading-relaxed max-w-xl">
            {description}
          </p>
          <div className="pt-4">
            <button className="group flex items-center gap-3 border border-white/40 px-6 py-3 hover:border-white hover:bg-white/10 transition-all duration-300">
              <span className="text-white text-sm font-light tracking-wide uppercase">
                {buttonText}
              </span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </MediaBackground>
  );
}
