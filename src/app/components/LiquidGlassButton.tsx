import { ArrowRight } from 'lucide-react';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import LiquidGlass from '../liquid-glass/LiquidGlass.js';
import { useLandingPreferences } from '../landingPreferences.js';
import './landing-liquid-glass.css';

type LiquidGlassButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  showArrow?: boolean;
  testId?: string;
}>;

const PRESS = { type: 'spring', stiffness: 420, damping: 23, mass: 0.65 } as const;

export default function LiquidGlassButton({
  children, className = '', showArrow = true, testId = 'liquid-glass-button',
  type = 'button', disabled, ...buttonProps
}: LiquidGlassButtonProps) {
  const reduceMotion = useReducedMotion();
  const { theme } = useLandingPreferences();
  const interactive = !reduceMotion && !disabled;

  return (
    <LiquidGlass
      data-testid={`${testId}-surface`}
      data-disabled={disabled || undefined}
      radius={32}
      tone={theme}
      sheen
      className="landing-start-surface"
      initial={false}
      animate="rest"
      whileHover={interactive ? 'hover' : undefined}
      whileTap={interactive ? 'press' : undefined}
      variants={{ rest: { scaleX: 1, scaleY: 1 }, hover: { scaleX: 1.018, scaleY: 1.018 }, press: { scaleX: 1.035, scaleY: 0.94 } }}
      transition={PRESS}
    >
      <button {...buttonProps} type={type} disabled={disabled} data-testid={testId}
        className={`landing-start-button ${className}`.trim()}>
        <span>{children}</span>
        {showArrow ? (
          <motion.span aria-hidden="true" className="landing-start-arrow"
            variants={{ rest: { x: 0 }, hover: { x: 3 }, press: { x: 3 } }} transition={PRESS}>
            <ArrowRight size={22} />
          </motion.span>
        ) : null}
      </button>
    </LiquidGlass>
  );
}
