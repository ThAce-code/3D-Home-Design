import { ArrowRight } from 'lucide-react';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type LiquidGlassButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    motionVariant?: 'default' | 'hero-cta';
    showArrow?: boolean;
    testId?: string;
  }
>;

export default function LiquidGlassButton({
  children,
  className = '',
  motionVariant = 'default',
  showArrow = true,
  testId = 'liquid-glass-button',
  type = 'button',
  ...buttonProps
}: LiquidGlassButtonProps) {
  const content = motionVariant === 'hero-cta' ? (
    <>
      <span aria-hidden="true" className="liquid-glass-hero-cta-ink" />
      <span aria-hidden="true" className="liquid-glass-hero-cta-gloss" />
      <span className="liquid-glass-content liquid-glass-hero-cta-content">
        {showArrow ? (
          <span aria-hidden="true" className="liquid-glass-hero-cta-icon-zone">
            <span className="liquid-glass-hero-cta-arrow-track">
              <ArrowRight className="liquid-glass-arrow-icon liquid-glass-hero-cta-arrow-primary" />
              <ArrowRight className="liquid-glass-arrow-icon liquid-glass-hero-cta-arrow-secondary" />
            </span>
          </span>
        ) : null}
        <span className="liquid-glass-label liquid-glass-hero-cta-label">{children}</span>
      </span>
    </>
  ) : (
    <span className="liquid-glass-content">
      <span className="liquid-glass-label">{children}</span>
      {showArrow ? (
        <span aria-hidden="true" className="liquid-glass-dark-arrow">
          <ArrowRight className="liquid-glass-arrow-icon" />
        </span>
      ) : null}
    </span>
  );

  return (
    <span className="liquid-glass-wrapper">
      <button
        {...buttonProps}
        type={type}
        data-testid={testId}
        className={`liquid-glass-shell liquid-glass-pill ${className}`.trim()}
      >
        <span aria-hidden="true" className="liquid-glass-depth-ring" />
        <span aria-hidden="true" className="liquid-glass-inner-ring" />
        {content}
      </button>
    </span>
  );
}
