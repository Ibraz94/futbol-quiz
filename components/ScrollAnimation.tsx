"use client";

import { ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface ScrollAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

const ScrollAnimation: React.FC<ScrollAnimationProps> = ({ 
  children, 
  className = "",
  delay = 0.3,
  direction = "up",
  distance = 50,
  duration = 0.8,
  threshold = 0.2,
  once = true
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once,
    amount: threshold,
    margin: "0px 0px -100px 0px" // Only trigger when element is 100px from bottom of viewport
  });

  const getDirectionOffset = () => {
    switch (direction) {
      case "up":
        return { y: distance };
      case "down":
        return { y: -distance };
      case "left":
        return { x: distance };
      case "right":
        return { x: -distance };
      default:
        return { y: distance };
    }
  };

  const initialOffset = getDirectionOffset();

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        ...initialOffset
      }}
      animate={isInView ? { 
        opacity: 1,
        x: 0,
        y: 0
      } : { 
        opacity: 0,
        ...initialOffset
      }}
      transition={{ 
        duration,
        ease: [0.4, 0, 0.2, 1], // Custom easing for smoother animation
        delay: isInView ? delay : 0
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollAnimation; 