// GLEn core self-tests. Run from the repo root:  node tests/run_tests.js
// Extracts the <script id="core"> block from index.html, so the tests always check the shipped code.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, Math, Number, isNaN, isFinite, Error, Infinity });
const c = mod.exports;

let pass = 0, fail = 0;
const near = (a, b, tol, msg) => {
  const ok = Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}: got ${a}, expected ${b}`);
};
const base = { hdirRight: true, angleSys: 'auto', cForward: 0, aimV: 0, aimH: 0, hLamp: 0.65, spacing: 1.4, rht: true, lat: 3.1,
  eyes: [1.1], dmin: 50, dmax: 50, dstep: 1, La: 1, age: 40, pig: 0.5, lvModel: 'sh', thMin: 0.1, tau: 1, eyePlane: 'lamp' };
const uniform = { type: 'A', H: [-90, 90], V: [-90, 90], cd: [[1000, 1000], [1000, 1000]], peak: 1000 };

// 1. de Boer against hand calculation
const den = 0.003 * (1 + Math.sqrt(1 / 0.04)) * Math.pow(60, 0.46);
near(c.deBoerW([{ E: 0.1, thDeg: 1 }], 1).raw, 5 - 2 * Math.log10(0.1 / den), 1e-12, 'de Boer W, E=0.1 lx, θ=1°, La=1');

// 2. Inverse-square law, both lamps, uniform 1000 cd
let r = c.evaluate({ ...base, iesL: uniform }).at(0).rows[0];
const eHand = 1000 / (50 ** 2 + 2.4 ** 2 + 0.45 ** 2) + 1000 / (50 ** 2 + 3.8 ** 2 + 0.45 ** 2);
near(r.E, eHand, 1e-12, 'Eye illuminance, uniform 1000 cd at 50 m');

// 3. Windscreen transmission and line-of-sight plane
near(c.evaluate({ ...base, iesL: uniform, tau: 0.8 })[0].rows[0].E, 0.8 * eHand, 1e-12, 'τ = 0.8 scales E');
const rl = c.evaluate({ ...base, iesL: uniform, eyePlane: 'los' })[0].rows[0];
const cosL = 50 / Math.hypot(50, 2.4, 0.45), cosR = 50 / Math.hypot(50, 3.8, 0.45);
near(rl.E, 1000 / (50 ** 2 + 2.4 ** 2 + 0.45 ** 2) * cosL + 1000 / (50 ** 2 + 3.8 ** 2 + 0.45 ** 2) * cosR, 1e-12, 'E·cosθ plane');

// 4. Stiles–Holladay veiling luminance and TI
const thL = Math.acos(cosL) / (Math.PI / 180), thR = Math.acos(cosR) / (Math.PI / 180);
const lvHand = 10 * (1000 / (50 ** 2 + 2.4 ** 2 + 0.45 ** 2)) / thL ** 2 + 10 * (1000 / (50 ** 2 + 3.8 ** 2 + 0.45 ** 2)) / thR ** 2;
near(r.Lv, lvHand, 1e-12, 'Stiles–Holladay Lv');
near(r.TI, 65 * lvHand, 1e-12, 'TI at La = 1');

// 5. CIE 146 reduces to known value at θ = 1°, age 0, p = 0: 10 + 5 = 15 × E
near(c.veilingLum([{ E: 1, thDeg: 1 }], 'cie', 0, 0), 15, 1e-12, 'CIE 146 at θ=1°, A=0, p=0');

// 6. Aim: lamp aimed 1° down sees a horizontal ray 1° up in its own frame
const v = c.toLampFrame(1, 0, 0, -1, 0);
near(Math.asin(v[2]) * 180 / Math.PI, 1, 1e-9, 'Vertical aim sign');
const h = c.toLampFrame(1, 0, 0, 0, 1);
near(Math.atan2(h[1], h[0]) * 180 / Math.PI, -1, 1e-9, 'Horizontal aim sign (lamp aimed right → ray appears left)');

// 7. Type C parsing, symmetry and C-plane option
const txt = 'IESNA:LM-63-2002\n[TEST] c\nTILT=NONE\n1 1000 1 3 3 1 2 0 0 0\n1 1 0\n0 90 180\n0 90 180\n100 500 100\n100 800 100\n100 300 100\n';
const ic = c.parseIES(txt);
near(c.intensityDir(ic, 1, 0, 0, { hdirRight: true }), 500, 1e-12, 'Type C: ahead = C0, γ90');
near(c.intensityDir(ic, 1, 0, 0, { hdirRight: true, cForward: 90 }), 800, 1e-12, 'Type C: ahead = C90 option');
near(c.intensityDir(ic, 0, 0, -1, { hdirRight: true }), 100, 1e-12, 'Type C: nadir γ0');

// 8. Type A vs B give the same value on the axes
const grid = { type: 'A', H: [-10, 0, 10], V: [-10, 0, 10], cd: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], peak: 9 };
near(c.intensityDir(grid, 1, 0, 0, { hdirRight: true }), 5, 1e-12, 'Type A on axis');
near(c.intensityDir({ ...grid, type: 'B' }, 1, 0, 0, { hdirRight: true }), 5, 1e-12, 'Type B on axis');

// 9. Distance loop: no float drift, exact count
const rows = c.evaluate({ ...base, iesL: uniform, dmin: 10, dmax: 200, dstep: 0.1 })[0].rows;
near(rows.length, 1901, 0, 'Row count 10…200 m step 0.1');
near(rows.at(-1).d, 200, 0, 'Last distance exactly 200');

// 10. Demo beam: LHT is the mirror of RHT
const dR = c.demoIES(false), dL = c.demoIES(true), dir = c.hvToDir(-3.43, 0.57), dirM = c.hvToDir(3.43, 0.57);
near(c.intensityDir(dL, ...dirM, { hdirRight: true }), c.intensityDir(dR, ...dir, { hdirRight: true }), 1e-9, 'Demo LHT = mirrored RHT');

// 11. Input check
near(c.checkCfg({ ...base, dmin: 100, dmax: 50 }).length > 0 ? 1 : 0, 1, 0, 'checkCfg rejects bad range');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
