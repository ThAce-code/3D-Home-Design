/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowRight,
  Box,
  ChevronRight,
  Compass,
  Cpu,
  Gamepad2,
  Layers,
  Move,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "motion/react";

const LiquidNavbar = () => {
  const navRef = useRef<HTMLElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const hoverState = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const smoothHover = useSpring(hoverState, { stiffness: 100, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // 1. 常驻收缩状态 (Always Contracted / Floating Pill)
  const baseOffsetY = 16;
  const borderRadius = "32px";
  const paddingX = "32px";
  const edgeShadow = "inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.15)";

  // 2. 悬浮时的弹性拉伸 (Stretching / Elasticity on Hover)
  const pullX = useTransform(smoothX, (x) => {
    if (!navRef.current) return 0;
    const rect = navRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    return ((x - centerX) / centerX) * 10; // Max horizontal pull
  });
  
  const pullY = useTransform(smoothY, (y) => {
    if (!navRef.current) return 0;
    const rect = navRef.current.getBoundingClientRect();
    const centerY = rect.height / 2;
    return ((y - centerY) / centerY) * 8; // Max vertical pull
  });

  const activePullX = useTransform(() => pullX.get() * smoothHover.get());
  const activePullY = useTransform(() => pullY.get() * smoothHover.get());

  // 4. 动态高光 (Dynamic Specular Highlight)
  const sheenOpacity = useTransform(smoothHover, [0, 1], [0, 0.7]);
  const backgroundSheen = useMotionTemplate`radial-gradient(circle 250px at ${smoothX}px ${smoothY}px, rgba(255,255,255,${sheenOpacity}), transparent 80%)`;

  // 5. 色差 (Chromatic Aberration)
  const chromaX = useTransform(smoothX, x => {
    if (!navRef.current) return 0;
    const rect = navRef.current.getBoundingClientRect();
    return ((x - rect.width / 2) / (rect.width / 2)) * 6;
  });
  const chromaY = useTransform(smoothY, y => {
    if (!navRef.current) return 0;
    const rect = navRef.current.getBoundingClientRect();
    return ((y - rect.height / 2) / (rect.height / 2)) * 6;
  });
  const chromaOpacity = useTransform(smoothHover, [0, 1], [0, 0.3]);
  const chromaShadow = useMotionTemplate`
    inset ${chromaX}px ${chromaY}px 12px rgba(255, 0, 0, ${chromaOpacity}), 
    inset calc(${chromaX}px * -1) calc(${chromaY}px * -1) 12px rgba(0, 255, 255, ${chromaOpacity})
  `;

  return (
    <motion.nav 
      ref={navRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => hoverState.set(1)}
      onMouseLeave={() => hoverState.set(0)}
      style={{ paddingLeft: paddingX, paddingRight: paddingX, y: baseOffsetY }}
      className="fixed top-0 w-full z-50 h-24 pointer-events-auto flex items-center justify-center"
    >
      <motion.div 
        className="relative w-full h-full max-w-[1920px] mx-auto overflow-hidden flex items-center justify-between px-8"
        style={{
          x: activePullX,
          y: activePullY,
          borderRadius,
          boxShadow: edgeShadow,
          backdropFilter: "blur(3px) saturate(110%)",
          WebkitBackdropFilter: "blur(3px) saturate(110%)",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderTop: "1px solid rgba(255, 255, 255, 0.4)",
          transformOrigin: "center center"
        }}
      >
        {/* Dynamic Specular Highlight (Sheen) */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: backgroundSheen, mixBlendMode: "overlay" }}
        />

        {/* Chromatic Aberration Layer */}
        <motion.div 
          className="absolute inset-0 pointer-events-none rounded-inherit"
          style={{ boxShadow: chromaShadow, mixBlendMode: "color-burn" }}
        />

        {/* Inner Glass Reflection */}
        <div className="absolute inset-0 rounded-inherit pointer-events-none" style={{
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 20px rgba(255,255,255,0.1)",
          mixBlendMode: "screen"
        }}></div>

        {/* Content */}
        <div className="relative z-10 flex items-center gap-8">
          <a href="#" className="flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt="Facility Design Logo" 
              className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/shapes/svg?seed=Facility&backgroundColor=ffffff&shape1Color=0ea5e9&shape2Color=f97316";
              }}
            />
            <span className="text-xl font-bold bg-gradient-to-r from-secondary-fixed-dim to-primary-container bg-clip-text text-transparent font-headline tracking-tighter">
              Facility Design
            </span>
          </a>
          <div className="hidden md:flex gap-8 font-headline text-sm tracking-tight">
            <a className="text-slate-600 hover:text-secondary-fixed-dim transition-colors" href="#">Gallery</a>
            <a className="text-slate-600 hover:text-secondary-fixed-dim transition-colors" href="#">Features</a>
            <a className="text-slate-600 hover:text-secondary-fixed-dim transition-colors" href="#">Pricing</a>
            <a className="text-slate-600 hover:text-secondary-fixed-dim transition-colors" href="#">About</a>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <button className="px-6 py-2.5 bg-primary-container text-on-primary-container font-headline font-bold rounded-lg shadow-lg shadow-primary-container/20 hover:opacity-90 transition-all duration-300 scale-95 hover:scale-100 active:scale-90">
            Launch Editor
          </button>
        </div>
      </motion.div>
    </motion.nav>
  );
};

export default function App() {
  // Mouse Parallax Setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    // Normalize to -1 to 1
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Smooth out the mouse movement
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Transform values for background (moves with mouse) and UI (moves opposite)
  const bgX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const bgY = useTransform(smoothY, [-1, 1], [-15, 15]);
  const uiX = useTransform(smoothX, [-1, 1], [5, -5]);
  const uiY = useTransform(smoothY, [-1, 1], [5, -5]);

  return (
    <div
      className="bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container min-h-screen relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background Layer (Z-0) with Parallax & Entrance Animation */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.img
          className="w-full h-full object-cover opacity-60"
          alt="Ultra-modern minimalist bright living room"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWFzjYbOAim9JYHcDd1mqyRNrXaKGpfB4_3NjpmzUDTGD0YpNa-lRGZ06Z0-1lgTDSdi2GzSzUOffbEbjdV6qTfE7PsvzOlZS9jLaXVKLrr9R1nCTawml0bVoMDk17hLaDRJKT820KaknhLLr_etWKFbKghkm1dfhVB-ZO_zOs2Xj1rwOK3eBTnwACZMAPnftpWUXLXD9x-GVFlvYSSRAthQToIIViL1F9XNR5D1TxhvxcHBSqqkX_8UctAiH_HhxAHlyKfsj4kajE"
          initial={{ filter: "blur(20px)", scale: 1.1 }}
          animate={{ filter: "blur(2px)", scale: 1.05 }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{ x: bgX, y: bgY }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/20 via-surface/40 to-surface"></div>
        <div className="absolute inset-0 hero-gradient"></div>
      </div>

      {/* TopNavBar - Advanced Liquid Glass Effect */}
      <LiquidNavbar />

      {/* Parallax Wrapper for Main Content */}
      <motion.div
        style={{ x: uiX, y: uiY }}
        className="relative z-10 w-full flex flex-col items-center"
      >
        {/* Main Content Canvas */}
        <main className="pt-32 pb-20 px-6 min-h-screen flex flex-col items-center w-full max-w-[1920px]">
          {/* Hero Section */}
          <section className="max-w-4xl text-center mb-24 mt-12 md:mt-24">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container/30 text-secondary font-label text-[10px] uppercase tracking-widest rounded-full mb-8 border border-secondary-fixed-dim/20"
            >
              <Compass className="w-3.5 h-3.5" />
              Next-Gen Spatial Engine
            </motion.div>
            
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="font-headline text-5xl md:text-7xl lg:text-8xl font-bold text-on-surface leading-[0.95] tracking-tight mb-8"
            >
              Build Your Architectural <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-on-surface to-on-surface-variant">
                Dream. Realized.
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              className="font-body text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              A precision configurator for interactive 3D interior design and
              floor planning. Craft environments with the fluidity of an artist
              and the precision of an engineer.
            </motion.p>
            
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-10 py-5 bg-primary-container text-on-primary-container font-headline font-bold rounded-xl shadow-[0_0_40px_-10px_rgba(255,159,28,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(255,159,28,0.8)] transition-shadow duration-500 flex items-center gap-3 overflow-hidden"
              >
                <span className="relative z-10">Start Designing</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-5 bg-white/40 backdrop-blur-md border border-secondary-fixed-dim/50 text-secondary font-headline font-bold rounded-xl hover:bg-teal-400/10 hover:border-teal-400/80 transition-colors duration-300"
              >
                View Demo
              </motion.button>
            </motion.div>
          </section>

          {/* Bento Grid Features */}
          <section className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-auto">
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ 
                y: -8, 
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)"
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
              className="glass-panel p-8 rounded-2xl group relative"
            >
              <motion.div
                variants={{
                  hover: {
                    y: [0, -6, 0],
                    transition: { repeat: Infinity, duration: 0.6, ease: "easeInOut" },
                  },
                }}
                className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center mb-6"
              >
                <Move className="text-secondary-fixed-dim w-7 h-7" />
              </motion.div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">
                Drag & Drop Geometry
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed opacity-80">
                Seamlessly manipulate 3D volumes with our proprietary spatial
                snapping engine. Architecture made tactile.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                Explore Tool <ChevronRight className="w-3 h-3" />
              </div>
            </motion.div>

            {/* Card 2 (Highlight) */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ 
                y: -8, 
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)"
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
              className="glass-panel p-8 rounded-2xl group relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/10 rounded-full blur-2xl"></div>
              <motion.div
                variants={{
                  hover: {
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0],
                    transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" },
                  },
                }}
                className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center mb-6"
              >
                <Gamepad2 className="text-secondary-fixed-dim w-7 h-7" />
              </motion.div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">
                Immersive FPS Roaming
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed opacity-80">
                Experience your floor plans in real-time first-person
                perspective. Walk through your creation before a single brick is
                laid.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                View Modes <ChevronRight className="w-3 h-3" />
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ 
                y: -8, 
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)"
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
              className="glass-panel p-8 rounded-2xl group relative"
            >
              <motion.div
                variants={{
                  hover: {
                    y: [0, -3, 0],
                    opacity: [0.6, 1, 0.6],
                    transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" },
                  },
                }}
                className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center mb-6"
              >
                <Cpu className="text-secondary-fixed-dim w-7 h-7" />
              </motion.div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">
                Facility Optimized
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed opacity-80">
                Engineered for large-scale architectural workflows. High-poly
                counts, real-time lighting, and precise CAD exports.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                Specs <ChevronRight className="w-3 h-3" />
              </div>
            </motion.div>
          </section>
        </main>

        {/* Interactive Component Preview */}
        <section className="max-w-7xl mx-auto px-6 py-32 w-full grid md:grid-cols-2 gap-20 items-center overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="order-2 md:order-1 relative"
          >
            <div className="aspect-square bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl relative group">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt="Technical top-down 3D architectural floor plan"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0LS8jvYWCaJnhXSPGbH7ZBDU8WXiNSqt6xl9iZKLU8rT1M2h8_9A8ENmRbnqR0KRAZHpiIpB76Ks_w96UUF_iFb5Zsz2O4yYaPN7Et-NLJ-E37LK4-JHgDJ3AzvNfzZ7a21sNTPpjvsClPymNZbAMHTJKER8G26FBIeF3HbfBfs0usBOslRRTLagEElWwxMOeo3freqDwR7lBjA0rYUfRdaDc1dnmMufW1AR571jBRgLqyAGzkO_p3tfptqFToZm690ztcLz5o6lT"
              />
              {/* Floating Glass UI Controls */}
              <div className="absolute bottom-6 left-6 right-6 glass-panel p-4 rounded-xl flex justify-between items-center">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center">
                    <Box className="text-white w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                    <Layers className="text-secondary w-4 h-4" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-label font-bold text-on-surface">
                    SCALE: 1:50
                  </span>
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded text-[10px] font-label font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
            {/* Accent Element */}
            <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl"></div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="order-1 md:order-2"
          >
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-surface mb-8 leading-tight">
              Design with the <br />
              Speed of Thought.
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-1 rounded-full bg-primary-container"></div>
                <div>
                  <h4 className="font-headline font-bold text-on-surface mb-2">
                    Real-time Raytracing
                  </h4>
                  <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                    Visualize materials, lighting, and textures with cinematic
                    fidelity as you work. No wait times, just instant beauty.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-1 rounded-full bg-secondary-fixed-dim"></div>
                <div>
                  <h4 className="font-headline font-bold text-on-surface mb-2">
                    Smart Asset Library
                  </h4>
                  <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                    Access a curated gallery of 5,000+ architect-certified
                    furniture pieces, fixtures, and structural elements.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="w-full py-12 border-t border-slate-200/20 bg-slate-50">
          <div className="flex flex-col md:flex-row justify-between items-center px-12 w-full max-w-7xl mx-auto gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Facility Design Logo" 
                  className="w-12 h-12 object-contain grayscale opacity-70"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/shapes/svg?seed=Facility&backgroundColor=ffffff&shape1Color=0ea5e9&shape2Color=f97316";
                  }}
                />
                <span className="text-lg font-bold text-slate-900 font-headline">
                  Facility Design
                </span>
              </div>
              <p className="font-body text-slate-500 uppercase tracking-widest text-[10px]">
                © 2024 Facility Design Architectural Studio. All rights reserved.
              </p>
            </div>
            <div className="flex gap-8">
              <a
                className="font-label text-xs text-slate-400 hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 transition-all"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="font-label text-xs text-slate-400 hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 transition-all"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="font-label text-xs text-slate-400 hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 transition-all"
                href="#"
              >
                Cookie Settings
              </a>
              <a
                className="font-label text-xs text-slate-400 hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 transition-all"
                href="#"
              >
                Contact
              </a>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
