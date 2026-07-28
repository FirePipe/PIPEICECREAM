import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  showSplash: boolean;
  splashProgress: number;
  showSnowEffect?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  showSplash, 
  splashProgress 
}) => {
  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          style={{ transform: "translateZ(0)", willChange: "transform, opacity" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-transparent text-white select-none overflow-hidden pointer-events-none"
        >
          {/* Tizen OS Left Door Panel */}
          <motion.div
            exit={{ x: "-100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 w-1/2 bg-zinc-950 border-r border-cyan-500/25 z-30 shadow-[10px_0_40px_rgba(0,0,0,0.9)] pointer-events-auto"
          />
          {/* Tizen OS Right Door Panel */}
          <motion.div
            exit={{ x: "100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 right-0 w-1/2 bg-zinc-950 border-l border-cyan-500/25 z-30 shadow-[-10px_0_40px_rgba(0,0,0,0.9)] pointer-events-auto"
          />

          {/* Hardware-accelerated background radial gradient (contained within doors/center) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.2),rgba(9,9,11,0.95))] z-10 pointer-events-none" />

          <motion.div 
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative z-40 flex flex-col items-center justify-center px-4 w-full max-w-sm pointer-events-auto"
          >
            {/* Winking Ice Cream Character with GPU hardware acceleration */}
            <motion.div
              animate={{ 
                scale: [1, 1.04, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ transform: "translateZ(0)", willChange: "transform" }}
              className="mb-8 relative flex items-center justify-center w-32 h-32"
            >
              <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_18px_rgba(34,211,238,0.35)] overflow-visible">
                {/* Stick */}
                <rect x="42" y="80" width="16" height="35" rx="8" fill="#d97706" />
                
                {/* Ice Cream Body */}
                <path d="M 25 80 L 75 80 C 80 80, 85 70, 85 50 C 85 20, 75 10, 50 10 C 25 10, 15 20, 15 50 C 15 70, 20 80, 25 80 Z" fill="url(#icecream-splash-gradient)" />
                
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="icecream-splash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                
                {/* Cheeks */}
                <circle cx="30" cy="55" r="4.5" fill="#f472b6" opacity="0.7" />
                <circle cx="70" cy="55" r="4.5" fill="#f472b6" opacity="0.7" />
                
                {/* Left Eye (Open, with pupil shine) */}
                <circle cx="35" cy="45" r="5" fill="#172554" />
                <circle cx="37" cy="43" r="1.5" fill="#ffffff" />
                
                {/* Right Eye - Expressive Winking Eye Animation */}
                <g className="relative">
                  {/* Normal Open Eye State (Visible when not winking) */}
                  <motion.g
                    animate={{ opacity: [1, 1, 0, 0, 1, 1] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      times: [0, 0.18, 0.22, 0.52, 0.56, 1],
                      ease: "easeInOut"
                    }}
                  >
                    <circle cx="65" cy="45" r="5" fill="#172554" />
                    <circle cx="67" cy="43" r="1.5" fill="#ffffff" />
                  </motion.g>

                  {/* Winking Arc + Sparkle State (Visible during wink) */}
                  <motion.g
                    animate={{ 
                      opacity: [0, 0, 1, 1, 0, 0],
                      scale: [0.85, 0.85, 1, 1, 0.85, 0.85] 
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      times: [0, 0.18, 0.22, 0.52, 0.56, 1],
                      ease: "easeInOut"
                    }}
                    style={{ transformOrigin: "65px 45px" }}
                  >
                    {/* Playful curved wink line */}
                    <path
                      d="M 58 46 Q 65 39 72 46"
                      stroke="#172554"
                      strokeWidth="3.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Golden Wink Sparkle ✨ */}
                    <path
                      d="M 73 36 L 74.2 38.5 L 77 39 L 74.2 39.5 L 73 42 L 71.8 39.5 L 69 39 L 71.8 38.5 Z"
                      fill="#f59e0b"
                    />
                  </motion.g>
                </g>

                {/* Mouth - Slight smile curve that perks up when winking */}
                <motion.path 
                  animate={{ d: ["M 45 58 Q 50 63 55 58", "M 44 57 Q 50 65 56 57", "M 45 58 Q 50 63 55 58"] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    times: [0, 0.35, 1],
                    ease: "easeInOut"
                  }}
                  stroke="#172554" 
                  strokeWidth="2.8" 
                  fill="none" 
                  strokeLinecap="round" 
                />
              </svg>
            </motion.div>

            {/* Title */}
            <h1 className="font-sans text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 drop-shadow-md text-center">
              PIPE ICE CREAM
            </h1>

            {/* Progress Section */}
            <div className="w-full bg-zinc-900 rounded-full h-2 mb-3 overflow-hidden border border-zinc-800/80 shadow-inner">
              <motion.div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                animate={{ width: `${Math.round(splashProgress)}%` }}
                initial={{ width: "0%" }}
                transition={{ ease: "easeOut", duration: 0.08 }}
                style={{ transform: "translateZ(0)", willChange: "width" }}
              />
            </div>
            
            <div className="flex justify-between w-full text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {Math.round(splashProgress) < 100 ? "Congelando..." : "¡LISTO!"}
              </motion.span>
              <span>{Math.round(splashProgress)}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
