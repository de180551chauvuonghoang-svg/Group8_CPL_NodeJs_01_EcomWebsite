import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface CountUpNumberProps {
  value: number;
  formatter?: (value: number) => string;
  duration?: number;
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString('vi-VN');

export default function CountUpNumber({
  value,
  formatter = defaultFormatter,
  duration = 650,
  className,
}: CountUpNumberProps) {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);
  const currentValue = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion || duration <= 0) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    const startValue = currentValue.current;
    const difference = value - startValue;
    const startedAt = performance.now();
    let frameId = 0;

    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + difference * easedProgress;

      currentValue.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, reduceMotion, value]);

  return (
    <span className={className} aria-label={formatter(value)}>
      <span aria-hidden="true">{formatter(Math.round(displayValue))}</span>
    </span>
  );
}
