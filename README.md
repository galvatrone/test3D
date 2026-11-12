# test3D — cinematic 3D portfolio

A static portfolio site: a head made of cubes turns to face you, then scrolling flies the camera
through it and on through a gallery, a tunnel, a light beam and a red alley with the contact form.
No backend. All copy and projects live in JSON.

**Stack:** Vite, React, TypeScript, three, @react-three/fiber, @react-three/drei,
@react-three/postprocessing, GSAP ScrollTrigger, Lenis, @shadergradient/react (loader background),
@paper-design/shaders-react (liquid metal logo), and a liquid glass component adapted from
dashersw/liquid-glass-js.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static files in dist/
npm run preview   # serve dist/ locally
```

## Project layout

```
src/
  config/flight.ts      camera spline, scene anchors, scene z positions, every timing
  data/site.json        name, role, section copy, email, links
  data/projects.json    gallery cards (title, summary, image, link, tint)
  scenes/               everything inside the canvas, one file per scene
    World.tsx           the list of scenes, in flight order
    Head.tsx            cube head (InstancedMesh), intro turn, pointer, scatter
    HeroGrid.tsx        curved shader grid over the hero
    Gallery.tsx         project cards with glass frames
    Tunnel.tsx  Beam.tsx  Alley.tsx
    Atmosphere.tsx      fog and background colour per scene
    CameraRig.tsx       moves the camera along the spline, measures scroll speed
    PostFX.tsx          bloom, barrel blur, chromatic aberration, vignette
  shaders/              GLSL: head, grid, beam, barrel blur
  effects/              custom postprocessing Effect (barrel distortion + radial blur)
  ui/                   HTML over the canvas: nav, loader, scene text, contact form, glass, logo
  lib/                  face maps, scroll driver, device quality, shared flight state
public/
  face-depth.png        optional, see below
  face-color.png        optional
  projects/*.webp       gallery images
  logo-mark.svg         shape used by the liquid metal logo
```

## Replace the face scan

The head is built from two front-view images in `public/`:

- `face-depth.png`: greyscale depth map. White is closest to the viewer, black is background.
  Anything darker than about 4% grey is treated as background and gets no cube.
- `face-color.png`: colour of each pixel, same framing as the depth map. Optional.

Both are square; any size works because they are resampled to the cube grid
(264×264 on desktop, 202×202 on mobile, see `lib/quality.ts`). Frame the head so it fills
most of the square with a little margin, eyes at roughly 40% from the top.

The two PNGs that ship now are the procedural stand-in head exported to images
(`exportProceduralMaps` in `lib/faceMaps.ts`; in dev run `window.__exportFaceMaps(512)`), so they
also show the framing a real scan should follow. If `face-depth.png` is deleted, the same head is
generated in code at load time. The back of the skull is estimated from the outline of the mask, so a plain
front depth map is enough for the profile view to read as a full head.

Ways to get a depth map: export one from a phone's portrait mode or a 3D scan app, render the
Z pass of a head model in Blender, or run a monocular depth model (Depth Anything, MiDaS) on a
photo and save its output as greyscale.

## Add a scene

1. Create `src/scenes/MyScene.tsx`. Place its objects at a z range along the path,
   for example between z = -70 and z = -80.
2. Add that range to `FLIGHT.scenes` in `src/config/flight.ts`, and if the camera path should
   bend for it, add or move points in `FLIGHT.path`.
3. Render it in `src/scenes/World.tsx` (inside the `!prefersReducedMotion` block if it is part
   of the flight only).
4. Optional: give it its own fog in `src/scenes/Atmosphere.tsx` by adding a stop at its z.
5. For its text, add an anchor to `FLIGHT.anchors` (0 = hero, 1 = contact) and a
   `<section className="scene-text">` in `src/ui/Overlay.tsx` using `at(FLIGHT.anchors.myScene)`.
   Put the copy in `src/data/site.json`.

To check a frame without scrolling, open the dev server with `?p=0.5` (flight progress) and
`?pose=-1.57` (head rotation in radians, skips the intro).

## Deploy to static hosting

`vite.config.ts` uses `base: './'`, so the build runs from any folder.

```bash
npm run build
```

Upload the contents of `dist/` anywhere that serves static files:

- **GitHub Pages or a sub-folder of an existing site:** copy `dist/` to, for example,
  `test3D/` in the site repo and push. It will load at `https://your-site/test3D/`.
- **Vercel / Netlify / Cloudflare Pages:** build command `npm run build`, output directory `dist`.

## Performance and accessibility

- Desktop: about 29.5k cubes, dpr up to 2, full post-processing.
- Mobile (touch or narrow screens): about 17k cubes, dpr capped at 1.5,
  bloom and vignette only, plain glass on the gallery frames.
- `prefers-reduced-motion`: no flight, no smooth scroll, no intro turn. The head stays still and
  the sections read as a normal page.
- All text is real HTML over the canvas; the canvas itself is `aria-hidden`.
- The contact form is a demo. It does not send anything and says so after submit.

## Notes on the effect libraries

- **@shadergradient/react** ships an older copy of three's physical shader. `src/lib/threeCompat.ts`
  adds empty stand-ins for four shader chunks removed from recent three.js, which is enough for
  the `lightType="3d"` gradient used behind the loader.
- **liquid-glass-js (dashersw)** refracts a static html2canvas snapshot in one WebGL context per
  element, which cannot see a live three.js canvas. `src/ui/LiquidGlass.tsx` keeps its edge
  refraction idea but feeds it to an SVG displacement filter in `backdrop-filter`, so the glass
  bends the live scene. Browsers without SVG backdrop filters get a frosted blur.
- **liquid-logo (paper-design)** has no licence in its repository, so its code is not copied.
  The same liquid metal shader comes from the Apache-2.0 `@paper-design/shaders-react` package.
