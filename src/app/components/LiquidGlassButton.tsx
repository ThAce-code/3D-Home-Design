import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { LiquidGlassCta, type LiquidGlassAppearance } from '../liquid-glass/index.js';

type LiquidGlassButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    motionVariant?: 'default' | 'hero-cta';
    showArrow?: boolean;
    testId?: string;
    appearance?: LiquidGlassAppearance;
  }
>;

/** Homepage CTA — shared Liquid Glass surface with hover lift / arrow travel / spring press. */
export default function LiquidGlassButton({
  children,
  motionVariant: _motionVariant = 'hero-cta',
  showArrow: _showArrow = true,
  appearance = 'day',
  ...props
}: LiquidGlassButtonProps) {
  return (
    <LiquidGlassCta appearance={appearance} {...props}>
      {children}
    </LiquidGlassCta>
  );
}
