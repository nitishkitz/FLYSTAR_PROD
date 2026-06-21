# Flystar International Courier — Cinematic Redesign System

This document outlines the visual system, technical challenges, and scroll-engineering solutions implemented in the complete redesign of the **Flystar International Courier** landing page.

---

## 🎨 Visual System & Brand Logo Integration

We have traced the design structure and integrated coordinates from `flystar billheader.png` and the official `flystarLogo.png` file to build a clean, premium digital corporate identity:
1. **Logo Placement & Sizing**:
   - Swapped out temporary SVG tracers with the official `flystarLogo.png` file across all sections of the site.
   - Removed duplicate company name HTML text (like *FLYSTAR INTERNATIONAL COURIER*) next to the image assets, since the logo itself already contains the stylized brand name. This prevents layout crowding.
   - Scaled up the logo display sizes for readability:
     - **Navbar Header**: Set to `h-16 sm:h-20` to make it prominent.
     - **Initial System Preloader**: Centered at `w-16 h-16` inside the spinning loader ring.
     - **Footer Section**: Rendered at `h-16` for dark background alignment.
2. **Contact Coordinates**: Integrated the exact phone cell numbers (`8125477584`, `9666145766`), business email (`flystarintl1@gmail.com`), and physical location (opposite the Tirupati Passport Office, AIR Bypass Road) into floating glassmorphic info widgets.
3. **Color Palette**:
   - Primary: `#0B2545` (Deep Logistics Navy)
   - Accent: `#D91A2A` (Flystar Red)
   - Success/Active: `#10B981` (Green hologram checks)
   - Backgrounds: Off-white slate (`#F8FAFC`) with minimalist dotted world grid textures.

---

## ⚙️ Technical Resolution: Scroll Jitter, Jittery Frame Scrubbing, and Blank Screen Gaps

### The Problems
1. **Blank Screen Gap**: Pinned GSAP ScrollTrigger containers combined with nested CSS sticky containers created duplicate scroll spacing calculations. GSAP added an extra `700vh` of pin spacer padding below the `800vh` parent container, resulting in a blank screen gap at the end before the Footer scrolled in.
2. **Choppy/Jittery Frame Scrubbing**: Loading only every second frame caused a low frame density, making the scrub transitions feel choppy or stepped.
3. **Micro-Flickering on Scroll**: Clearing the canvas (`ctx.clearRect`) on every frame update caused microsecond layout paints of empty canvas before drawing the new frame, resulting in flickering and jitter.
4. **Micro-Jitter from Mouse Scroll**: A low GSAP scrub value (`0.1`) caused the frames to snap instantly to scroll position changes, conveying wheel ticks as jittery jumps.

### The Engineered Solutions
We implemented a series of visual and performance optimizations to make the scroll feel completely smooth and premium:

1. **Native CSS Sticky + GSAP ScrollTrigger Hybrid (No Pin Spacing)**:
   - Changed GSAP ScrollTrigger `pin` to `false`.
   - Anchored the viewport using native CSS `sticky top-0 h-screen` on the child container inside the `800vh` parent container.
   - This allows the parent to scroll naturally relative to the viewport over its `800vh` height.
   - Once the scroll reaches `700vh` (progress 100%), the sticky child reaches the bottom of the parent and scrolls out of the viewport. The Corporate Footer (rendered immediately after the parent in the document flow) slides in seamlessly from the bottom with **zero overlap** and **zero blank screen gap**.
2. **Preloading All Available Frames**:
   - Removed the frame filtering in the preloader to cache all available frames in memory, doubling the frame density and rendering resolution of the scrub.
3. **No-Clear Direct Overwrites**:
   - Removed the `ctx.clearRect` call from the frame render function. Since the images cover the entire canvas, the new frame completely overwrites the previous frame, eliminating micro-flashing and layout-clearing latency.
4. **Scrub Momentum Easing**:
   - Increased the ScrollTrigger `scrub` value to `0.6`. This adds a momentum-based smoothing delay to frame transitions, turning mouse-wheel steps into a continuous cinematic movement.
5. **Video Asset Cleanup**:
   - Safely deleted all unused `.mp4` video files from the assets directory, confirming that the site runs 100% on optimized image frames.
