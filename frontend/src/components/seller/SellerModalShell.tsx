import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SellerModalShellProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth: string;
}

export default function SellerModalShell({ children, onClose, maxWidth }: SellerModalShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidth} overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest shadow-2xl`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
