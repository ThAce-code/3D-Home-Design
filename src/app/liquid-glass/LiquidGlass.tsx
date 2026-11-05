import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import {
  supportsSvgBackdropFilter,
  useLiquidGlassFilter,
  useLiquidGlassSettings,
  useSpecularTracking,
  type LiquidGlassSettings,
} from './useLiquidGlass.js';
import './liquid-glass.css';

export type LiquidGlassProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
  children?: ReactNode;
  /** Corner radius in px, or `pill` for fully rounded ends. Must match the rendered shape. */
  radius?: number | 'pill';
  tone?: 'light' | 'dark';
  /** Overrides the tone's tint colour, e.g. a low-alpha brand colour. */
  tint?: string;
  /** Opt this surface out of refraction (it still gets frost, rim and highlight). */
  refract?: boolean;
  /** Soft light that follows the pointer across the surface on hover. */
  sheen?: boolean;
  settings?: Partial<LiquidGlassSettings>;
};

export default function LiquidGlass({
  children,
  radius = 24,
  tone = 'light',
  tint,
  refract = true,
  sheen = false,
  settings: overrides,
  className = '',
  style,
  ...motionProps
}: LiquidGlassProps) {
  const settings = { ...useLiquidGlassSettings(), ...overrides };
  const reduceMotion = useReducedMotion();
  const { ref, filterId, size, mapUrl, ready } = useLiquidGlassFilter(radius, settings.bezel);
  useSpecularTracking(ref, settings.specular && !reduceMotion);

  const svgSupported = supportsSvgBackdropFilter();
  const wantsRefraction = settings.refract && refract && svgSupported;
  const refracting = wantsRefraction && ready;
  // Preparation only happens before first paint; resizing keeps the refraction pipeline active.
  const mode = refracting ? 'refract' : wantsRefraction ? 'preparing' : 'frost';
  const backdropFilter = refracting
    ? `url(#${filterId})`
    : `blur(${settings.blur + (wantsRefraction ? 0 : 9)}px) saturate(${settings.saturation})`;

  const scale = settings.refraction;
  const dispersion = settings.dispersion;

  return (
    <motion.div
      ref={ref}
      {...motionProps}
      data-lg-mode={mode}
      data-lg-tone={tone}
      className={`lg ${sheen ? 'lg-has-sheen' : ''} ${className}`.trim()}
      style={{
        borderRadius: radius === 'pill' ? 9999 : radius,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        ...(tint ? ({ '--lg-tint': tint } as CSSProperties) : null),
        ...style,
      }}
    >
      {svgSupported && size && mapUrl ? (
        <svg aria-hidden="true" className="lg-filter-defs" width="0" height="0">
          <filter
            id={filterId}
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={settings.blur} result="blurred" />
            <feImage
              href={mapUrl}
              x="0"
              y="0"
              width={size.width}
              height={size.height}
              preserveAspectRatio="none"
              result="map"
            />
            {dispersion > 0 ? (
              <>
                {/* Chromatic aberration: each channel bends by a slightly different amount. */}
                <feDisplacementMap in="blurred" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dispR" />
                <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
                <feDisplacementMap in="blurred" in2="map" scale={scale * (1 + dispersion)} xChannelSelector="R" yChannelSelector="G" result="dispG" />
                <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
                <feDisplacementMap in="blurred" in2="map" scale={scale * (1 + dispersion * 2)} xChannelSelector="R" yChannelSelector="G" result="dispB" />
                <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
                <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="redGreen" />
                <feComposite in="redGreen" in2="blue" operator="arithmetic" k2="1" k3="1" result="displaced" />
              </>
            ) : (
              <feDisplacementMap in="blurred" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="displaced" />
            )}
            <feColorMatrix in="displaced" type="saturate" values={String(settings.saturation)} />
          </filter>
        </svg>
      ) : null}
      {children}
      <span aria-hidden="true" className="lg-rim" />
      {sheen ? <span aria-hidden="true" className="lg-sheen" /> : null}
    </motion.div>
  );
}
