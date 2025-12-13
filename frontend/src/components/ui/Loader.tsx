import { motion } from 'framer-motion';
import { Scan } from 'lucide-react';

interface LoaderProps {
  message?: string;
  submessage?: string;
}

export const Loader = ({ message = 'Processing...', submessage }: LoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      {/* Animated scanner icon */}
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Scan className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        
        {/* Scanning line effect */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-primary/60 rounded-full"
          style={{ top: '20%' }}
          animate={{
            top: ['20%', '80%', '20%'],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <motion.p
          className="text-lg font-medium text-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.p>
        {submessage && (
          <p className="text-sm text-muted-foreground">{submessage}</p>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
};
