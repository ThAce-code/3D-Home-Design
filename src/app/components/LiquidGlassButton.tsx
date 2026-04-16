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
      <span aria-hidden="true" className="liquid-glass-hero-cta-shell-fill" />
      <span aria-hidden="true" className="liquid-glass-hero-cta-track" />
      <span aria-hidden="true" className="liquid-glass-hero-cta-fill" />
      <span aria-hidden="true" className="liquid-glass-hero-cta-ink liquid-glass-hero-cta-orb">
        <svg
          className="liquid-glass-hero-cta-play-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 18V6l8 6-8 6Z" />
        </svg>
      </span>
      <span aria-hidden="true" className="liquid-glass-hero-cta-gloss" />
      <span className="liquid-glass-content liquid-glass-hero-cta-content">
        <span aria-hidden="true" className="liquid-glass-hero-cta-slot liquid-glass-hero-cta-slot-start" />
        <span className="liquid-glass-label liquid-glass-hero-cta-label">{children}</span>
        <span aria-hidden="true" className="liquid-glass-hero-cta-slot liquid-glass-hero-cta-slot-end" />
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
