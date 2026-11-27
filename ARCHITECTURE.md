# Observatory Hub — Architecture

A private web app that controls my telescope rigs from anywhere. It runs on the observatory mini PC and is only reachable by my own devices.

The public sky viewer is a **separate** project (`sky_viewer`), hosted on static hosting. This repo holds no public website and must never be exposed to the internet.

---

## 1. The big picture

```
  My phone / home PC
        │
        │  Tailscale (private encrypted network between my own devices;
        │             nothing is open to the public internet)
        ▼
┌──────────────────── Observatory mini PC (Windows) ─────────────────────┐
│                                                                        │
│   Observatory Hub  (Python, FastAPI)  ◄── this repo                    │
│     • web pages: status, controls, latest image, logs                  │
│     • session logic: what to shoot, when to stop                       │
│        │                         │                                     │
│        │ HTTP                    │ ASCOM (direct, later)               │
│        ▼                         ▼                                     │
│   NINA + Advanced API plugin    Planetary tools (SharpCap / FireCapture)│
│        │                         custom tracking loop for the Dob      │
│        ▼                                                               │
│   ASCOM / vendor drivers                                               │
└────────┼───────────────────────────────────────────────────────────────┘
         │ USB
         ▼
   Mount · cameras · focuser · filter wheel · (later) roof, weather sensor
```

**In plain language:**
- **NINA does the hardware work.** It already knows how to talk to my mount and cameras, and it does capture, plate solving, autofocus and sequences. I don't rewrite any of that.
- **The hub is a layer on top.** It asks NINA (through NINA's Advanced API plugin, which adds a web API to NINA) what is happening and tells it what to do. The hub's job is to give me *my* interface and *my* automation.
- **Tailscale** is a free private network. With it, my phone can reach the mini PC as if it were at home, but nobody else on the internet can see it. **No router ports get opened.**

---

## 2. One hub, three rigs

Each rig is a NINA **equipment profile**. The hub just picks which profile is active, so the same pages work for every rig.

| Rig | Mount | Camera | Main use | Capture tool |
|---|---|---|---|---|
| Deep-sky (current) | ZWO AM3 | ASI183MC Pro on ~360 mm refractor | Deep-sky imaging | NINA |
| All-sky survey | ZWO AM3 | Nikon Z5 + 85 or 135 mm lens | Survey mosaic for the sky viewer | NINA (Z5 via Nikon driver) |
| GoTo Dobsonian (planned) | OnStep (ASCOM driver) | Planetary camera (TBD) | Jupiter/Moon lucky imaging, time lapses | SharpCap or FireCapture, plus a custom tracking loop |

**Why the Dob is different:** lucky imaging means capturing thousands of very short frames at high speed. NINA isn't built for that. For planetary sessions the hub starts a planetary capture tool instead. The "keep Jupiter centered" feedback loop (measure the planet's position in each frame, then nudge the mount) is custom code that talks to the mount through ASCOM.

---

## 3. Safety rules (these don't change)

1. **The hub is never public.** It's reachable only over Tailscale. No port forwarding, no public URL.
2. **Safety logic lives on the mini PC, not in the browser.** If my phone or the home Wi-Fi disconnects mid-session, the observatory must still finish or abort safely (stop exposure, park the mount).
3. **Hardware limits beat software limits.** For the Dob: normally-closed limit switches and absolute encoders, with software limits on top as a second layer.
4. **Every command that moves hardware needs a clear "stop" button** that works from every page.
5. **Simulators first.** Each new feature is built and tested against NINA's simulator devices before it touches real hardware.

---

## 4. Technology choices

| Piece | Choice | Why |
|---|---|---|
| Operating system | Windows (already on the mini PC) | NINA and ASCOM drivers are already set up |
| Hardware control | NINA + Advanced API plugin | Reuses a working, tested setup |
| Hub backend | Python + FastAPI | I know Python; FastAPI is small and simple |
| Hub frontend | Plain HTML + JavaScript to start | No build tools; add a framework only if needed |
| Remote access | Tailscale | Private and free, with no open ports |
| Direct device access (later) | ASCOM (via Python, e.g. Alpaca) | For the Dob tracking loop and anything NINA can't do |

---

## 5. Build plan (one step at a time)

Each step should work before starting the next.

1. **Read-only status page.** On my home PC, with NINA running simulator devices: a page that shows mount RA/Dec, whether it's tracking, camera temperature, and the current sequence state. It only reads, and moves nothing.
2. **Latest image view.** Show the most recent frame NINA captured (a small JPEG preview).
3. **Remote access.** Move the hub to the mini PC, install Tailscale on the mini PC, home PC and phone, and open the status page from my phone.
4. **Basic controls.** Park/unpark, slew to target, start/stop a sequence, all with the stop button always visible. Tested on simulators, then on the real AM3.
5. **Profile switching.** Pick rig (deep-sky / survey) from the hub.
6. **Survey session tool.** Load a panel list for the all-sky survey, track which panels are done, and resume where I left off on the next clear night.
7. **Logs and notifications.** Session log, plus a phone alert when a sequence ends or something fails.
8. **Observatory hardware (later).** Weather sensor, roof control, and automatic close-on-rain that works even if the hub is down.
9. **Dob integration (later).** OnStep mount, planetary capture, the Jupiter-centroid tracking loop.
10. **Publishing pipeline (later).** Send finished images to the public `sky_viewer` repo so the public site updates.

---

## 6. Open questions

- Which version of the NINA Advanced API plugin is installed, and which endpoints does it offer? (Check its documentation before step 1.)
- Mini PC specs (CPU, RAM, disk). Is it powerful enough to run the hub alongside NINA? (It almost certainly is, since the hub is light.)
- Is the Z5 reliable under NINA control for multi-hour survey runs?
- Planetary camera choice for the Dob.
- Observatory structure: roll-off roof, dome, or a pier with a cover?
