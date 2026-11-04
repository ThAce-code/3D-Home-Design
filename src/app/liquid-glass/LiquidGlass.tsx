import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { useDisplacementMap } from './useDisplacementMap.js';
import { usePointerHighlight } from './usePointerHighlight.js';
import { usePrefersReducedTransparency } from './media.js';
import './liquid-glass.css';

export type LiquidGlassVariant = 'default' | 'navbar' | 'cta' | 'panel';
export type LiquidGlassAppearance = 'day' | 'night';

type CommonProps = {
  variant?: LiquidGlassVariant;
  appearance?: LiquidGlassAppearance;
  refraction?: boolean;
  pointerHighlight?: boolean;
  radius?: number;
  wrapperClassName?: string;
  contentClassName?: string;
  testId?: string;
  beforeContent?: ReactNode;
};

export type LiquidGlassDivProps = PropsWithChildren<
  CommonProps & HTMLAttributes<HTMLDivElement> & { as?: 'div' }
>;

export type LiquidGlassButtonProps = PropsWithChildren<
  CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as: 'button' }
>;

export type LiquidGlassProps = LiquidGlassDivProps | LiquidGlassButtonProps;

const LiquidGlass = forwardRef<HTMLDivElement | HTMLButtonElement, LiquidGlassProps>(function LiquidGlass(
  props,
  forwardedRef,
) {
  const {
    children,
    className = '',
    wrapperClassName = '',
    contentClassName = '',
    variant = 'default',
    appearance = 'day',
    as = 'div',
    refraction = true,
    pointerHighlight = true,
    radius = 28,
    testId,
    beforeContent,
    style,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    ...rest
  } = props as LiquidGlassProps & { as?: 'div' | 'button' };

  const surfaceRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  useImperativeHandle(forwardedRef, () => surfaceRef.current as HTMLDivElement | HTMLButtonElement);

  const reducedTransparency = usePrefersReducedTransparency();
  const displacement = useDisplacementMap(surfaceRef, {
    radius,
    enabled: refraction && !reducedTransparency,
  });
  const highlight = usePointerHighlight(surfaceRef, { enabled: pointerHighlight });
  const reactId = useId().replace(/:/g, '');
  const filterDomId = `lg-displace-${reactId}`;
  const surfaceClassName = ['liquid-glass-surface', className].filter(Boolean).join(' ');

  const pointerHandlers = {
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      highlight.onPointerMove(event as never);
      onPointerMove?.(event as never);
    },
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      highlight.onPointerEnter(event as never);
      onPointerEnter?.(event as never);
    },
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      highlight.onPointerLeave();
      onPointerLeave?.(event as never);
    },
  };

  const dataAttrs = {
    'data-testid': testId,
    'data-lg-variant': variant,
    'data-lg-appearance': appearance,
    'data-lg-reduced-transparency': reducedTransparency ? 'true' : 'false',
    'data-lg-refraction': displacement.enabled ? 'true' : 'false',
  } as const;

  const layers = (
    <>
      {displacement.enabled && displacement.mapUrl ? (
        <>
          <svg width={0} height={0} className="absolute" aria-hidden="true" focusable="false">
            <filter id={filterDomId} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
              <feImage href={displacement.mapUrl} result="map" preserveAspectRatio="none" width={displacement.width} height={displacement.height} />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={28} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>
          <span aria-hidden="true" className="liquid-glass-refraction" style={{ filter: `url(#${filterDomId})` }} />
        </>
      ) : (
        <span aria-hidden="true" className="liquid-glass-refraction" hidden />
      )}
      <span aria-hidden="true" className="liquid-glass-depth-ring" />
      <span aria-hidden="true" className="liquid-glass-inner-ring" />
      <span aria-hidden="true" className="liquid-glass-highlight" style={highlight.highlightStyle} />
      {beforeContent}
      <span className={['liquid-glass-content', contentClassName].filter(Boolean).join(' ')}>{children}</span>
    </>
  );

  return (
    <span className={['liquid-glass-wrapper', wrapperClassName].filter(Boolean).join(' ')}>
      {as === 'button' ? (
        <button
          {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
          {...pointerHandlers}
          {...dataAttrs}
          ref={surfaceRef as React.RefObject<HTMLButtonElement>}
          type={(rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button'}
          className={[surfaceClassName, 'liquid-glass-cta-button'].filter(Boolean).join(' ')}
          style={style as CSSProperties | undefined}
        >
          {layers}
        </button>
      ) : (
        <div
          {...(rest as HTMLAttributes<HTMLDivElement>)}
          {...pointerHandlers}
          {...dataAttrs}
          ref={surfaceRef as React.RefObject<HTMLDivElement>}
          className={surfaceClassName}
          style={style as CSSProperties | undefined}
        >
          {layers}
        </div>
      )}
    </span>
  );
});

export default LiquidGlass;
