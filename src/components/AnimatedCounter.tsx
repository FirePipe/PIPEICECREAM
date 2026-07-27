import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  className = "",
  suffix = "",
}) => {
  const prevValueRef = useRef<number>(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (value > prevValueRef.current) {
      setDirection("up");
      setPulse(true);
    } else if (value < prevValueRef.current) {
      setDirection("down");
      setPulse(true);
    }
    prevValueRef.current = value;
    
    const timer = setTimeout(() => setPulse(false), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const variants = {
    initial: (dir: "up" | "down" | null) => ({
      y: dir === "up" ? 14 : dir === "down" ? -14 : 0,
      opacity: 0,
      scale: 0.85,
    }),
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 350,
        damping: 18,
      },
    },
    exit: (dir: "up" | "down" | null) => ({
      y: dir === "up" ? -14 : dir === "down" ? 14 : 0,
      opacity: 0,
      scale: 0.85,
      transition: {
        duration: 0.12,
      },
    }),
  };

  return (
    <motion.span
      animate={pulse ? { scale: [1, 1.25, 0.95, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center justify-center font-mono font-bold select-none ${className}`}
    >
      <span className="relative flex items-center justify-center overflow-hidden h-[1.3em] min-w-[1rem] px-0.5">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.span
            key={value}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      {suffix && <span className="ml-1">{suffix}</span>}
    </motion.span>
  );
};
