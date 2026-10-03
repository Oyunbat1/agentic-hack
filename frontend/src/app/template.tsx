"use client";

import { motion } from "motion/react";

/** Remounts on every route change, so each page fades in. Opacity only: a transform here would break `fixed` sheets inside pages. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
