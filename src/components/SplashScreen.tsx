import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { IceCream } from "lucide-react";

interface SplashScreenProps {
  showSplash: boolean;
  splashProgress: number;
  showSnowEffect: boolean;
}

const getFlavorGradient = (id: string) => {
  switch (id) {
    case "queso": return (<><stop offset="0%" stopColor="#fffbeb" /><stop offset="100%" stopColor="#fef3c7" /></>);
    case "coco": return (<><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f4f4f5" /></>);
    case "mora": return (<><stop offset="0%" stopColor="#701a75" /><stop offset="100%" stopColor="#4a044e" /></>);
    case "pina": return (<><stop offset="0%" stopColor="#fef08a" /><stop offset="100%" stopColor="#eab308" /></>);
    case "maracuya": return (<><stop offset="0%" stopColor="#facc15" /><stop offset="100%" stopColor="#d97706" /></>);
    case "frutos_rojos": return (<><stop offset="0%" stopColor="#be123c" /><stop offset="100%" stopColor="#881337" /></>);
    case "lulo": return (<><stop offset="0%" stopColor="#a3e635" /><stop offset="100%" stopColor="#65a30d" /></>);
    case "arequipe": return (<><stop offset="0%" stopColor="#d97706" /><stop offset="100%" stopColor="#78350f" /></>);
    case "tres_leches": return (<><stop offset="0%" stopColor="#fafaf9" /><stop offset="100%" stopColor="#e7e5e4" /></>);
    case "mango_biche": return (<><stop offset="0%" stopColor="#84cc16" /><stop offset="100%" stopColor="#4d7c0f" /></>);
    default: return (<><stop offset="0%" stopColor="#0891b2" /><stop offset="100%" stopColor="#0284c7" /></>);
  }
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  showSplash, 
  splashProgress, 
  showSnowEffect 
}) => {
  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white select-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.2),rgba(9,9,11,1))] z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-zinc-950 z-0" />

          <div className="absolute -bottom-32 left-1/4 w-[600px] h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute -top-32 right-1/4 w-[600px] h-96 bg-blue-600/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />

          <div className="relative z-20 flex flex-col items-center justify-center max-w-lg sm:max-w-2xl px-4 sm:px-6 text-center w-full my-auto">
            <div className="min-h-[2.5rem] sm:min-h-[3.2rem] flex items-center justify-center mb-2">
              <h1 className="font-sans text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.15em] sm:tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-500 select-none drop-shadow-[0_2px_12px_rgba(34,211,238,0.4)]">
                PIPE ICE CREAM
              </h1>
            </div>
            
            <div className="min-h-[2rem] sm:min-h-[2.5rem] flex items-center justify-center mb-4 sm:mb-6">
              <motion.p
                initial={{ opacity: 0.5 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-[10px] xs:text-xs sm:text-sm font-extrabold uppercase tracking-[0.08em] xs:tracking-[0.12em] sm:tracking-[0.22em] text-cyan-300 font-mono select-none text-center px-4 max-w-full leading-relaxed"
              >
                Sincronizando Neveras...
              </motion.p>
            </div>

            <div className="w-full max-w-xs sm:max-w-sm mx-auto transition-all duration-500 rounded-3xl p-6 sm:p-8 relative flex flex-col items-center bg-zinc-950/40 border border-white/[0.06] backdrop-blur-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="relative flex items-center justify-center w-48 h-56 sm:w-56 sm:h-64 select-none overflow-visible">
                <svg viewBox="0 0 120 160" className="w-full h-full filter drop-shadow-[0_16px_32px_rgba(168,85,247,0.25)] overflow-visible">
                  <defs>
                    <linearGradient id="stick-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e2b77a" />
                      <stop offset="50%" stopColor="#f3d09a" />
                      <stop offset="100%" stopColor="#ca9d5d" />
                    </linearGradient>

                    <linearGradient id="popsicle-rainbow-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="20%" stopColor="#f97316" />
                      <stop offset="40%" stopColor="#eab308" />
                      <stop offset="60%" stopColor="#22c55e" />
                      <stop offset="80%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>

                    <clipPath id="popsicle-clip">
                      <path d="M 36 112 L 44 32 C 46 19, 53 14, 60 14 C 67 14, 74 19, 76 32 L 84 112 C 84 115, 81 117, 78 117 L 42 117 C 39 117, 36 115, 36 112 Z" />
                    </clipPath>
                  </defs>

                  <path d="M 54 115 L 66 115 C 69 115, 69 145, 66 145 L 54 145 C 51 145, 51 115, 54 115 Z" fill="url(#stick-gradient)" stroke="rgba(0, 0, 0, 0.15)" strokeWidth="0.5" />
                  <path d="M 36 112 L 44 32 C 46 19, 53 14, 60 14 C 67 14, 74 19, 76 32 L 84 112 C 84 115, 81 117, 78 117 L 42 117 C 39 117, 36 115, 36 112 Z" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />
                  
                  <g clipPath="url(#popsicle-clip)">
                    <rect x="20" y={117 - (splashProgress / 100) * 103} width="80" height={(splashProgress / 100) * 103} fill="url(#popsicle-rainbow-gradient)" className="transition-all duration-150 ease-out" />
                    <path d="M 44 32 L 36 112" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
                    <path d="M 76 32 L 84 112" stroke="rgba(0, 0, 0, 0.15)" strokeWidth="1" />
                    <path d="M 44 32 C 46 19, 53 14, 60 14 C 67 14, 74 19, 76 32" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" fill="none" />
                    <path d="M 52 35 L 52 98" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 60 38 L 60 95" stroke="rgba(168, 85, 247, 0.12)" strokeWidth="10" strokeLinecap="round" />
                    <path d="M 68 35 L 68 98" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1.5" strokeLinecap="round" />
                    <motion.g
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      fill="none"
                      strokeLinecap="round"
                      filter="drop-shadow(0px 1.5px 2px rgba(0,0,0,0.65))"
                    >
                      <path d="M 45 54 Q 50 49 55 54" />
                      <motion.path 
                        d="M 65 54 Q 70 49 75 54"
                        animate={{
                          d: [
                            "M 65 54 Q 70 49 75 54",
                            "M 65 54 Q 70 49 75 54",
                            "M 65 53 Q 70 53 75 53",
                            "M 65 54 Q 70 49 75 54",
                          ]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          repeatDelay: 0.5,
                          ease: "easeInOut",
                          times: [0, 0.4, 0.5, 0.6]
                        }}
                      />
                      <path d="M 48 63 Q 60 76 72 63" />
                    </motion.g>
                  </g>
                </svg>
              </div>

              <div className="mt-6 flex flex-col items-center w-full max-w-[240px] sm:max-w-[280px]">
                <div className="w-full h-3 bg-zinc-950/50 border border-white/[0.05] rounded-full overflow-hidden p-[2px] shadow-inner relative">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-500 to-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]" style={{ width: `${Math.round(splashProgress)}%` }} transition={{ ease: "easeOut", duration: 0.1 }} />
                </div>
                <div className="flex items-center justify-between w-full mt-3 px-1 font-mono text-[10px] sm:text-xs tracking-widest text-cyan-300 uppercase font-black">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]">
                    {Math.round(splashProgress) < 100 ? "Congelando..." : "¡LISTO PARA REFRESCAR!"}
                  </span>
                  <span className="text-white drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]">{Math.round(splashProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 border-[10px] border-white/[0.03] pointer-events-none z-30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
