# procedural-badlands

Procedurally generated terrain rendering. Go to the [demo](https://bhudiaxyz.github.io/procedural-badlands/).

All code and everything you make with it is completely free in every way. No credit required. Enjoy!

![1](http://i.imgur.com/tlXbuDR.jpg)

![2](http://i.imgur.com/3b94oU2.jpg)

![3](http://i.imgur.com/ciVQEtS.jpg)

![4](http://i.imgur.com/tefuxlM.jpg)

![5](http://i.imgur.com/kecWkb1.jpg)

## Getting started

```bash
npm install
npm start        # dev server at http://localhost:8080
npm run build    # production build → dist/
npm run deploy   # build + publish to GitHub Pages
```

## Architecture

The renderer is a multi-pass deferred pipeline executed entirely on the GPU via [regl](https://github.com/regl-project/regl). Each frame is generated offline (not real-time) — the pipeline runs once per seed and yields a single composited image. Rendering is progressive: each pass processes a horizontal slice per animation frame so the browser stays responsive throughout.

### Render pipeline

Each pass writes into a floating-point RGBA framebuffer (WebGL1 + `OES_texture_float`). Passes run in order:

| Pass | Output | Notes |
| --- | --- | --- |
| **Height map** | 1024 × 1024 float texture | Fractal noise evaluated over the full terrain footprint (128 km × 128 km). Used by every subsequent pass as a terrain lookup. |
| **Sky cubemap** | 1024 px cube texture (6 faces) | Rayleigh + Mie atmospheric scattering ([glsl-atmosphere](https://github.com/wwwtyro/glsl-atmosphere)) rendered once for the current sun direction. |
| **Terrain positions** | Screen-res float texture | 32 × 32 grid of chunked meshes projected into view space. Each chunk is a 32 × 32 indexed triangle grid displaced by the height map in the vertex shader. |
| **Shadow volume** | 1024 × 1024 float texture | Ray-marched horizon shadow from the sun direction across the height map. |
| **Normal map** | Screen-res float texture | Finite-difference surface normals computed from the height function at each visible position. |
| **Participating media** | Screen-res float texture | Per-pixel volumetric fog integral (uniform + ground-hugging exponential fog) ray-marched from camera to terrain. |
| **Diffuse** | Screen-res float texture | Terrain colour blended from four configurable RGB values (high/low altitude × steep/flat slope), driven by height and a dot-product slope test. Cursive fractal noise adds micro-detail variation. |
| **Ambient occlusion** | Screen-res float texture | Hemisphere sampling (128 stratified vectors) against the height map. Sky radiance is accumulated for each unoccluded sample, giving both soft sky illumination and contact shadowing in one pass. |
| **Direct lighting** | Screen-res float texture | Sun contribution: shadow map lookup + Lambertian diffuse + sky cubemap specular. |
| **Compose** | Screen-res float texture | Multiplies diffuse × (ambient + direct), applies participating media (fog) as a linear blend, and adds sky for sky-visible pixels. |
| **Copy** | Canvas | Blits the composed texture to the screen. |

### Noise

Terrain height is built from 2D gradient noise (Perlin) with fractal octave summation (`height.glsl` → `cursive.glsl` → `perlin.glsl`). The gradient table is stored in a 256 × 256 float texture generated on the CPU each frame from the seed RNG, giving fully deterministic results per seed string.

### Seeding

The seed string is hashed via [alea](https://github.com/coverslide/node-alea) to produce a fast PRNG. All render parameters (camera FOV, direction, altitude, time of day, terrain colours, fog density) are drawn from this PRNG at frame start, so any seed string deterministically reproduces the same image.

### Progressive rendering

`ProgressiveRenderer` batches each pass into horizontal scissor-box slices. It dynamically adjusts the slice height (`yStep`) to target ~10 frames per second during generation — doubling the step when ahead, trimming it when behind.

## Stack

- [regl](https://github.com/regl-project/regl) — WebGL1 command abstraction
- [glslify](https://github.com/glslify/glslify) — GLSL module system (`#pragma glslify:`)
- [glsl-atmosphere](https://github.com/wwwtyro/glsl-atmosphere) — Rayleigh/Mie sky shader
- [gl-matrix](https://glmatrix.net/) — matrix/vector math
- [alea](https://github.com/coverslide/node-alea) — seeded PRNG
- [webpack 5](https://webpack.js.org/) — bundler
- [Bootstrap 5](https://getbootstrap.com/) — UI
- [Inter](https://rsms.me/inter/) — typeface

## Based on

Original work by [Rye Terrell (wwwtyro)](https://github.com/wwwtyro/badlands).
