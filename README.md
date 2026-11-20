# GLEn — Glare Evaluation

Web tool for evaluating oncoming-driver glare from headlamp IES files: eye illuminance, discomfort glare (de Boer) and disability glare (veiling luminance / threshold increment) versus distance on a straight road.

Single self-contained page: open `index.html` in a browser, or serve it with GitHub Pages. No build step, no dependencies.

## Features (v0.2)
- Left/right IES files (LM-63, photometric Type A, B, C) with symmetry handling; angle-system override, H+ direction, C-plane forward selection
- Vertical/horizontal aim, mounting height, lamp spacing, RHT/LHT, observer lateral offset, up to 3 eye heights
- Eye illuminance (worst case or E·cosθ plane), windscreen transmission
- de Boer W (Schmidt-Clausen & Bindels), veiling luminance (CIE 146 age-adjusted or Stiles–Holladay), TI
- Model-validity flags for glare angle; pass/fail against user limits
- Isocandela map with eye-point trace; B50L/R value; data table; CSV export
- Built-in synthetic low beam for demonstration

## Tests
```
node tests/run_tests.js
```
The tests extract the core maths from `index.html`, so they always check the shipped code.

## Roadmap
Curves and gradients, mirror glare for preceding vehicles, PDF report.

## Licence
MIT © 2026 Jalib Akther
