// Shared 3D mount view for the hub mockups.
// MOCKUP ONLY: fake sky data, no connection to NINA or any hardware.
// Needs three.js r128 and its OrbitControls loaded first (global THREE).
//
// Usage:
//   const view = Mount3D.create(containerEl, {
//     update(dt) { return { sol: Mount3D.solve(target, lst), roofOpen: 1 }; },  // where the mount should go
//     after(state) { /* state.ax1, state.ax2 (radians), state.slewing */ }       // what it is doing now
//   });
(function () {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const LAT = 40 * D2R;            // observer latitude (Ohio, roughly)
  const SLEW_RATE = 8 * D2R;       // fake slew speed, radians per second

  // Fake targets: RA in hours, Dec in degrees. "park" is the home position.
  const TARGETS = {
    park: { name: "Park (home)", park: true },
    m31:  { name: "M31 Andromeda Galaxy", ra: 0.712, dec: 41.27 },
    m45:  { name: "M45 Pleiades",         ra: 3.791, dec: 24.11 },
    m1:   { name: "M1 Crab Nebula",       ra: 5.575, dec: 22.01 },
    m42:  { name: "M42 Orion Nebula",     ra: 5.588, dec: -5.39 },
    m81:  { name: "M81 Bode's Galaxy",    ra: 9.926, dec: 69.07 }
  };

  const wrapHours = (h) => { h = ((h % 24) + 24) % 24; return h > 12 ? h - 24 : h; };
  const wrapRad = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- The math ----------
  // Hour angle H = sidereal time - RA (how far west of the meridian the target is).
  // For a German equatorial mount, pointing at (H, Dec) needs:
  //   target west of meridian (H >= 0): RA axis = -H,     Dec axis = 90° - Dec   (scope on east side, looking west)
  //   target east of meridian (H < 0):  RA axis = 180°-H, Dec axis = -(90° - Dec) (scope on west side, looking east)
  // Both keep the counterweight below the scope. Switching between them is the meridian flip.
  function solve(t, lst) {
    if (t.park) return { park: true, ax1: -Math.PI / 2, ax2: 0, side: "Home" };
    const H = wrapHours(lst - t.ra), h = H * 15 * D2R, d = t.dec * D2R;
    const alt = Math.asin(Math.sin(d) * Math.sin(LAT) + Math.cos(d) * Math.cos(LAT) * Math.cos(h));
    const west = H >= 0;
    return {
      H, alt, d, h,
      ax1: west ? -h : Math.PI - h,
      ax2: west ? Math.PI / 2 - d : -(Math.PI / 2 - d),
      side: west ? "East of pier" : "West of pier"
    };
  }

  // Direction to target in the polar-axis frame (+Y = pole, +Z = meridian on the equator, +X = east)
  const dirLocal = (h, d) => new THREE.Vector3(-Math.sin(h) * Math.cos(d), Math.sin(d), Math.cos(h) * Math.cos(d));

  // ---------- Readout formatting ----------
  const fmtH = (x) => { const s = x < 0 ? "-" : ""; x = Math.abs(x); let hh = Math.floor(x), mm = Math.round((x - hh) * 60);
    if (mm === 60) { hh++; mm = 0; } return `${s}${String(hh).padStart(2, "0")}h ${String(mm).padStart(2, "0")}m`; };
  const fmtD = (x) => { const s = x < 0 ? "−" : "+"; x = Math.abs(x); let dd = Math.floor(x), mm = Math.round((x - dd) * 60);
    if (mm === 60) { dd++; mm = 0; } return `${s}${String(dd).padStart(2, "0")}° ${String(mm).padStart(2, "0")}′`; };
  const fmtA = (r) => `${(wrapRad(r) * R2D).toFixed(1)}°`;

  // ---------- Scene ----------
  function create(container, opts) {
    opts = opts || {};
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
    camera.position.fromArray(opts.cameraPos || [4.6, 3.6, 5.6]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 1.5; controls.maxDistance = 14;

    scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x1a1410, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(3, 6, 4); scene.add(sun);

    const mat = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.2 }, extra));
    const M = {
      ground: mat(0x1a2026, { roughness: 1, metalness: 0 }),
      pier: mat(0x6b7480), mount: mat(0xc9302c), dark: mat(0x22262c), tube: mat(0xe8e8e8),
      wall: mat(0x8a7f6e, { transparent: true, opacity: 0.35, depthWrite: false }),
      roof: mat(0x9aa3ad, { transparent: true, opacity: 0.55, depthWrite: false })
    };

    // Ground + grid + compass
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 64), M.ground);
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const grid = new THREE.GridHelper(14, 28, 0x2b3440, 0x1f262e); grid.position.y = 0.002; scene.add(grid);

    function label(text, color) {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"); g.fillStyle = color; g.font = "600 84px IBM Plex Sans, sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 64, 68);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
      s.scale.set(0.5, 0.5, 1); return s;
    }
    // Convention: north = -Z, south = +Z, east = +X, west = -X, up = +Y
    [["N", 0, -3.6, "#e05a4f"], ["S", 0, 3.6, "#8592a3"], ["E", 3.6, 0, "#8592a3"], ["W", -3.6, 0, "#8592a3"]]
      .forEach(([t, x, z, col]) => { const s = label(t, col); s.position.set(x, 0.3, z); scene.add(s); });

    // Observatory placeholder: low walls + roll-off roof that slides north
    const W = 3.2, WALL_H = 1.0, T = 0.06, ROOF_Y = 2.75;
    [[0, -W / 2, W, T], [0, W / 2, W, T], [-W / 2, 0, T, W], [W / 2, 0, T, W]].forEach(([x, z, w, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), M.wall); m.position.set(x, WALL_H / 2, z); scene.add(m);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.08, W + 0.2), M.roof); scene.add(roof);
    [-W / 2, W / 2].forEach((x) => {  // rails the roof rolls along
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, W * 2.1), M.dark);
      rail.position.set(x, ROOF_Y - 0.07, -W * 0.55); scene.add(rail);
    });
    [[-W / 2, -W / 2], [W / 2, -W / 2], [-W / 2, W / 2], [W / 2, W / 2], [-W / 2, -W * 1.6], [W / 2, -W * 1.6]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, ROOF_Y - 0.1, 0.035), M.dark);
      post.position.set(x, (ROOF_Y - 0.1) / 2, z); scene.add(post);
    });

    // Pier
    const PIER_H = 1.2;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, PIER_H, 32), M.pier);
    pier.position.y = PIER_H / 2; scene.add(pier);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 32), M.dark);
    base.position.set(0, PIER_H + 0.02, 0); scene.add(base);

    // Mount hierarchy:
    //  latGroup : tilted so its local +Y points at the celestial pole (north, up by the latitude angle)
    //  raGroup  : spins around the polar axis (RA axis)
    //  decGroup : spins around the Dec axis (local X); the scope rides on +X, counterweight on -X
    const latGroup = new THREE.Group();
    latGroup.position.y = PIER_H + 0.05;
    latGroup.rotation.x = -(Math.PI / 2 - LAT);
    scene.add(latGroup);

    const raHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 32), M.mount);
    raHousing.position.y = 0.16; latGroup.add(raHousing);
    const raGroup = new THREE.Group(); latGroup.add(raGroup);
    const decGroup = new THREE.Group(); decGroup.position.y = 0.36; raGroup.add(decGroup);
    const decHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.26, 32), M.mount);
    decHousing.rotation.z = Math.PI / 2; decGroup.add(decHousing);

    // Counterweight shaft and weight on -X
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 16), M.pier);
    shaft.rotation.z = Math.PI / 2; shaft.position.x = -0.38; decGroup.add(shaft);
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 24), M.dark);
    weight.rotation.z = Math.PI / 2; weight.position.x = -0.55; decGroup.add(weight);

    // Saddle + refractor on +X; the tube's optical axis is local +Y of decGroup
    const scope = new THREE.Group(); scope.position.x = 0.24; decGroup.add(scope);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.07), M.dark); saddle.position.x = -0.07; scope.add(saddle);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 32), M.tube); tube.position.y = 0.08; scope.add(tube);
    const dew = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 32, 1, true), M.dark); dew.position.y = 0.47; scope.add(dew);
    const focuser = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 24), M.dark); focuser.position.y = -0.28; scope.add(focuser);
    const camBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 24), M.mount); camBody.position.y = -0.37; scope.add(camBody);

    // Dashed "where it should point" line, drawn from the mount head along the target direction
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const targetLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xe0b04f, dashSize: 0.12, gapSize: 0.08 }));
    scene.add(targetLine);

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(container); resize();

    // ---------- Animation loop ----------
    let ax1 = -Math.PI / 2, ax2 = 0;   // start parked
    let last = performance.now();
    const tmp = new THREE.Vector3();

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      const goal = opts.update ? opts.update(dt) : { sol: solve(TARGETS.park, 0), roofOpen: 1 };
      const sol = goal.sol;

      // Move each axis toward its goal at a capped speed (looks like a slew; tiny steps look like tracking)
      const d1 = wrapRad(sol.ax1 - ax1), d2 = wrapRad(sol.ax2 - ax2), step = SLEW_RATE * dt;
      ax1 += Math.max(-step, Math.min(step, d1));
      ax2 += Math.max(-step, Math.min(step, d2));
      raGroup.rotation.y = ax1;
      decGroup.rotation.x = ax2;
      const slewing = Math.abs(d1) > 0.5 * D2R || Math.abs(d2) > 0.5 * D2R;

      roof.position.set(0, ROOF_Y, -(goal.roofOpen == null ? 1 : goal.roofOpen) * W * 1.05);

      if (!sol.park) {
        tmp.copy(dirLocal(sol.h, sol.d)).applyQuaternion(latGroup.quaternion);
        const origin = latGroup.position.clone().add(new THREE.Vector3(0, 0.36, 0).applyQuaternion(latGroup.quaternion));
        const pos = lineGeo.attributes.position;
        pos.setXYZ(0, origin.x, origin.y, origin.z);
        pos.setXYZ(1, origin.x + tmp.x * 4, origin.y + tmp.y * 4, origin.z + tmp.z * 4);
        pos.needsUpdate = true; targetLine.computeLineDistances(); targetLine.visible = true;
      } else targetLine.visible = false;

      if (opts.after) opts.after({ ax1, ax2, slewing });
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.Mount3D = { LAT, D2R, R2D, TARGETS, solve, wrapHours, wrapRad, fmtH, fmtD, fmtA, create };
})();
