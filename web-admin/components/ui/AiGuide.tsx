import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Lottie to avoid SSR issues with canvas/window
const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

type AiGuideProps = {
  mood: 'welcoming' | 'waiting' | 'pointing' | 'confused';
  text: string;
  actionButton?: React.ReactNode;
};

const lottieUrls = {
  welcoming: 'https://lottie.host/5b214041-3e4e-4171-88f2-393278255946/O3Xg8Q7w7X.json',
  waiting: 'https://lottie.host/56728c0b-337c-4734-b235-9856f7091461/A1jXv3J7sI.json',
  pointing: 'https://lottie.host/9856f709-1461-4734-b235-56728c0b337c/pointing.json',
  confused: 'https://lottie.host/56728c0b-337c-4734-b235-9856f7091461/A1jXv3J7sI.json', // Fallback/same as waiting for now
};

export function AiGuide({ mood, text, actionButton }: AiGuideProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs sm:max-w-md mx-auto p-4 transition-all duration-300">
      {/* Speech Bubble */}
      <div className="relative bg-emerald-50 border border-emerald-100 rounded-2xl p-4 sm:p-6 mb-2 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
        <p className="text-emerald-800 text-base sm:text-lg font-medium text-center leading-relaxed font-sans">
          {text}
        </p>
        
        {/* Speech Bubble Tail */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-emerald-50 border-b border-r border-emerald-100 rotate-45"></div>
      </div>

      {/* Lottie Animation */}
      <div className="w-48 h-48 sm:w-64 sm:h-64 relative -mt-4 z-10 transition-all duration-300">
        <Lottie
          loop
          path={lottieUrls[mood]}
          play
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Action Button */}
      {actionButton && (
        <div className="mt-2 sm:mt-4 w-full flex justify-center">
          {actionButton}
        </div>
      )}
    </div>
  );
}
