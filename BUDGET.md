# Budget: GoTo Dobsonian

Rough cost estimate for converting my old manual 8" Dobsonian into a GoTo planetary imaging scope, controlled through this hub.

> These are **ballpark US prices (estimated 2026-11-27) from general knowledge, not current quotes**. Check real prices before buying. Used gear is often much cheaper.
>
> The all-sky survey budget lives in the `sky_viewer` repo (`BUDGET.md`).

## Starting point
- **Reusing:** the 8" tube and both mirrors (primary and secondary). Inspect the mirror coatings before deciding whether to recoat.
- **Replacing:** the mirror cell (in poor condition), the focuser, and both axes / the base (in poor condition). The new base is designed around the motors.

## Cost breakdown

| Item | Low | High | Notes |
|---|---|---|---|
| **Optics and tube** | | | |
| New 8" mirror cell (9-point) | $40 | $200 | DIY or 3D-printed is cheap; commercial costs more |
| Collimation knobs / springs | $15 | $30 | |
| 2" dual-speed Crayford focuser | $80 | $250 | Low-profile helps the camera reach focus |
| Mirror recoating (primary + secondary) | $0 | $300 | Only if the coatings are bad |
| **Base (new)** | | | |
| Plywood rocker box + ground board | $60 | $150 | |
| Bearings (azimuth + altitude) | $30 | $100 | Lazy susan, roller or PTFE pads |
| **GoTo drive** | | | |
| 2× stepper motors (NEMA 17/23) | $30 | $120 | Geared versions cost more |
| Reduction (belts/pulleys, large drive wheels or worm) | $40 | $200 | The hardest part to get right |
| OnStep controller board + 2× TMC2209/5160 drivers | $40 | $120 | |
| 2× AS5600 absolute encoders + limit switches | $15 | $40 | Hardware safety layer |
| 12 V power (supply or LiFePO4 battery) | $50 | $200 | |
| Wiring, connectors, enclosure, hardware | $40 | $100 | |
| **Planetary imaging** | | | |
| Planetary camera (e.g. ZWO ASI462MC / ASI585MC / ASI678MC) | $200 | $450 | |
| 2×–3× Barlow | $50 | $200 | |
| **Computer** | $0 | $300 | $0 if I reuse the observatory mini PC |
| **Total** | **≈ $690** | **≈ $2,960** | Without optional extras |

**Realistic middle:** about **$1,200–1,600**. Reusing the tube and mirrors is what keeps it below $1,900+.

## Optional
| Item | Low | High | Notes |
|---|---|---|---|
| Atmospheric dispersion corrector (ADC) | $100 | $200 | Helps when planets are low |
| Motorized primary collimation | **TBD** | **TBD** | A later upgrade |

## Suggested order (spreads the cost out)
1. **Optics first:** mirror cell, collimation knobs, focuser, and recoating if needed. Use the scope manually to confirm the optics are good.
2. **New base:** build the rocker box and bearings with room for the motors.
3. **GoTo drive:** motors, reduction, OnStep, encoders, limit switches, power.
4. **Planetary imaging:** camera and Barlow, then the Jupiter-centroid tracking loop in this hub.

## Not included
- Observatory structure (pier, roof, power)
- Tools for building the base (saw, drill, 3D printer)
