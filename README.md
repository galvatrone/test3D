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
  data/site.json        name, role, about, blog posts, section copy, email, links
  data/projects.json    all projects; featured ones become 3D cards
  scenes/               everything inside the canvas, one file per scene
    World.tsx           the list of scenes, in flight order
    Head.tsx            cube head (InstancedMesh), intro turn, pointer, scatter
    HeroGrid.tsx        curved shader grid over the hero
    PhotoHead.tsx       particle portrait from a photo or frame sequence (default hero)
    Gallery.tsx         clickable project cards with glass frames
    Tunnel.tsx  Beam.tsx  Notes.tsx  Alley.tsx
    Atmosphere.tsx      fog and background colour per scene
    CameraRig.tsx       moves the camera along the spline, measures scroll speed
    PostFX.tsx          bloom, barrel blur, chromatic aberration, vignette
  shaders/              GLSL: head, grid, beam, barrel blur
  effects/              custom postprocessing Effect (barrel distortion + radial blur)
  ui/                   HTML over the canvas: nav, loader, scene text, contact form, glass, logo
  lib/                  face maps, scroll driver, device quality, shared flight state
src/assets/
  portrait.jpg          the photo the particle portrait is made from
  projects/*.webp       gallery images (named in data/projects.json)
  logo-mark.svg         shape used by the liquid metal logo
public/
  face-depth.png, face-color.png   only for HEAD.mode = 'cubes'
  head-frames/          optional frame sequence for the portrait
```

## The portrait

The hero is a particle portrait sampled from `src/assets/portrait.jpg` (one particle per pixel of a
230×230 grid on desktop, 150×150 on mobile). The background is removed by colour: the average of the
four corners counts as backdrop, so a photo on a plain wall or studio background works best.

- **Replace the photo:** overwrite `src/assets/portrait.jpg` (square, head and shoulders, plain background).
- **Frame-by-frame head turn:** film a few seconds of your head turning from profile to the front
  on a plain background, then run `scripts/video-to-frames.sh head-turn.mp4` (needs ffmpeg).
  It writes `public/head-frames/frame_0001.webp…` and prints a line to paste into `HEAD.sequence`
  in `src/config/flight.ts`. On load the particles then play the turn while they assemble.
- **Cube head instead:** set `HEAD.mode = 'cubes'` to use the procedural cube head built from
  `public/face-depth.png` (white = closest) and `public/face-color.png`. Both shipped PNGs are the
  procedural stand-in exported to images (`window.__exportFaceMaps(512)` in dev).

Interaction: particles fly in and assemble on load, particles around the pointer scatter outward, a click sends a ring wave through the portrait, and scrolling scatters it.

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

Scroll and camera stay in sync through **stations**: `FLIGHT.anchors` says where on the page each
section's text sits, `FLIGHT.stations` says where the camera is at that moment, and scroll between
two anchors moves the camera between the two stations. A side trip is just a station off the main
line, like the notes room: the path in `FLIGHT.path` bends left to it and back.

To check a frame without scrolling, open the dev server with `?p=0.5` (scroll position),
`?assemble=0.5` (portrait mid-assembly) or `?pose=-1.57` (cube head rotation).

## Interaction

- Portrait: hover scatters the particles around the pointer, click sends a wave, scroll scatters it.
- Gallery: hover tilts a card toward the pointer, click opens the project panel
  (← and → switch projects, Esc closes).
- Scene rail on the right: click a dot to fly there; arrow keys, Page Up/Down and Space jump scenes.
- Light beam: press and hold to turn it up. Alley: click a neon sign to make it flicker.

## Where to host it

The site is static: after `npm run build` it is a folder of files (`dist/`) with no server code.
Nothing has to run on your own computer once it is published.

**Open it locally without a server:** double-click `dist/index.html`. The build ships one classic
script with images inlined, so it also works from `file://` (only the Google font needs internet).

**GitHub Pages with automatic builds (recommended, free, keeps your domain).**
`.github/workflows/deploy.yml` builds the site on GitHub's servers on every push to `main`.

1. Create a repository named `test3D` on GitHub and push this project to it.
2. In the repository: Settings → Pages → Source: **GitHub Actions**.
3. Push. About a minute later the site is live. Because your user site
   (`galvatrone/My-web.github.io`) already uses the custom domain `www.oneix.ltd`, a project
   repository's Pages site appears under it: **https://www.oneix.ltd/test3D/**.

**Vercel (alternative).** Import the repository at vercel.com, keep the detected preset (Vite,
build `npm run build`, output `dist`). Every push deploys, every branch gets a preview link.
Useful if you want previews; not needed just to host the site.

**Copy into an existing site.** Run `npm run build` and copy `dist/` into any folder of a static
site, for example `test3D/` in the oneix.ltd repository. This needs a rebuild on your machine after
every change, which the two options above avoid.

## Performance and accessibility

- Desktop: 230×230 particle grid (about half are the figure), dpr up to 2, full post-processing.
- Mobile (touch or narrow screens): 150×150 grid, dpr capped at 1.5,
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
