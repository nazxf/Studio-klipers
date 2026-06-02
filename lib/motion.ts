import type { Variants } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1] as const;
const spring = { type: "spring", stiffness: 120, damping: 22 } as const;

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeOut },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export const subtleHover = {
  y: -2,
  transition: spring,
};

export const sidebarItem: Variants = {
  inactive: { opacity: 0.86 },
  active: {
    opacity: 1,
    transition: { duration: 0.16, ease: easeOut },
  },
};

export const statusPulse: Variants = {
  idle: { opacity: 0.72, scale: 1 },
  active: {
    opacity: [0.72, 1, 0.72],
    scale: [1, 1.08, 1],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};
