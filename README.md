# BLD Memo Scanner

Astro SPA for scanning a physical 3×3 cube with the phone camera and generating Old Pochmann blindfold memo.

## Assumptions

- Speffz face order exactly as requested: U=A-D, L=E-H, F=I-L, R=M-P, B=Q-T, D=U-X.
- Edge buffer: UR / B.
- Corner buffer: UBL / A.
- Each face is scanned in a fixed camera orientation described on screen.

## Run

```bash
npm install
npm run dev
```

Camera access requires HTTPS or localhost.

## How scanning works

The app samples nine small regions inside the camera guide for each face. The six center stickers become color references, then every sampled sticker is classified by CIELAB distance. The review screen lets you tap a misclassified sticker to cycle it through U/L/F/R/B/D before memo generation.

## Memo behavior

Memo tracing follows Old Pochmann-style sticker cycles with alphabetical cycle breaks. Edge parity is flagged when the edge target count is odd.
