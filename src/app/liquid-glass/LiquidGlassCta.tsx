import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import LiquidGlass, { type LiquidGlassAppearance } from './LiquidGlass.js';

type LiquidGlassCtaProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    appearance?: LiquidGlassAppearance;
    testId?: string;
  }
>;

export default function LiquidGlassCta({
  children,
  appearance = 'day',
  testId = 'liquid-glass-button',
  className = '',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...buttonProps
}: LiquidGlassCtaProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="inline-flex"
      animate={reduceMotion ? { y: 0, scale: 1 } : { y: hovered ? -3 : 0, scale: 1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }}
    >
      <LiquidGlass
        as="button"
        variant="cta"
        appearance={appearance}
        testId={testId}
        className={['hero-liquid-glass-button', className].filter(Boolean).join(' ')}
        contentClassName="liquid-glass-cta-content"
        {...buttonProps}
        onMouseEnter={(event) => { setHovered(true); onMouseEnter?.(event); }}
        onMouseLeave={(event) => { setHovered(false); onMouseLeave?.(event); }}
        onFocus={(event) => { setHovered(true); onFocus?.(event); }}
        onBlur={(event) => { setHovered(false); onBlur?.(event); }}
      >
        <span className="liquid-glass-cta-label liquid-glass-label">{children}</span>
        <motion.span
          aria-hidden="true"
          className="liquid-glass-cta-arrow liquid-glass-dark-arrow"
          animate={reduceMotion ? { x: 0 } : { x: hovered ? 6 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 24 }}
        >
          <ArrowRight className="liquid-glass-cta-arrow-icon liquid-glass-arrow-icon" />
        </motion.span>
      </LiquidGlass>
    </motion.div>
  );
}
