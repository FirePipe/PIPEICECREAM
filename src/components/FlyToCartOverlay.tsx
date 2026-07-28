import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface FlyingParticle {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  imageUrl?: string;
  nombre?: string;
}

interface FlyToCartOverlayProps {
  particles: FlyingParticle[];
  onParticleComplete: (id: string) => void;
}

/**
 * =========================================================================
 * FLY-TO-CART TRAJECTORY ANIMATION ENGINE (GPU OPTIMIZED)
 * =========================================================================
 * Parameters to adjust velocity, curvature, scale and spin:
 * - DURATION: Flight duration in seconds (0.55s optimized for low-end mobile CPUs)
 * - ARC_PEAK: Parabolic height vertex offset (-90px to -140px above start Y)
 * - SCALE_CURVE: [0.85 -> 1.3 -> 0.25]
 * - ROTATE_SPIN: [0 -> -25 -> 360 degrees]
 * =========================================================================
 */
export const FlyToCartOverlay: React.FC<FlyToCartOverlayProps> = memo(({
  particles,
  onParticleComplete,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => {
          // Calculate intermediate midpoint for parabolic vertex arc
          const midX = (particle.startX + particle.endX) / 2;
          // ARC_PEAK: Controls how high the item flies in the air before landing in the cart
          const peakY = Math.min(particle.startY, particle.endY) - 100;

          return (
            <motion.div
              key={particle.id}
              initial={{
                x: particle.startX,
                y: particle.startY,
                scale: 0.8,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                /* Parabolic Arc X and Y keyframes */
                x: [particle.startX, midX, particle.endX],
                y: [particle.startY, peakY, particle.endY],
                /* Physics: Initial pop expansion, shrinking as it approaches target */
                scale: [0.85, 1.25, 0.25],
                /* Organic rotation during flight */
                rotate: [0, -25, 360],
                opacity: [1, 1, 0.85],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                /* DURATION: 0.55s snappy duration for low-latency feedback */
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => onParticleComplete(particle.id)}
              className="fixed top-0 left-0 w-12 h-12 -ml-6 -mt-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-lg shadow-brand-500/30 border-2 border-brand-500/80 flex items-center justify-center p-1 ring-2 ring-brand-500/20 transform-gpu will-change-transform translate-z-0"
            >
              {particle.imageUrl ? (
                <img
                  src={particle.imageUrl}
                  alt={particle.nombre || "Helado"}
                  className="w-full h-full object-contain rounded-xl pointer-events-none"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-xl filter drop-shadow-md">🍦</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

FlyToCartOverlay.displayName = "FlyToCartOverlay";

