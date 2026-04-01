import { ArrowRight } from 'lucide-react';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type LiquidGlassButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    showArrow?: boolean;
    testId?: string;
  }
>;

export default function LiquidGlassButton({
  children,
  className = '',
  showArrow = true,
  testId = 'liquid-glass-button',
  type = 'button',
  ...buttonProps
}: LiquidGlassButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      data-testid={testId}
      className={`liquid-glass-shell liquid-glass-pill ${className}`.trim()}
    >
      <span aria-hidden="true" className="liquid-glass-depth-ring" />
      <span aria-hidden="true" className="liquid-glass-inner-ring" />
      <span className="liquid-glass-content">
        <span className="liquid-glass-label">{children}</span>
        {showArrow ? (
          <span aria-hidden="true" className="liquid-glass-dark-arrow">
            <ArrowRight className="liquid-glass-arrow-icon" />
          </span>
        ) : null}
      </span>
    </button>
  );
}
