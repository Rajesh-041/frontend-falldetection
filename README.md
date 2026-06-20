# Fall Detection Frontend — SafeGuard AI

A React + TypeScript dashboard that streams live webcam frames to a fall-detection backend and surfaces real-time alerts, a confidence overlay, and a history of detected falls. It's the client for the [`backend-falldetection`](https://github.com/Rajesh-041/backend-falldetection) API.

## How it works

1. The dashboard accesses the user's webcam via `react-webcam`.
2. While "Monitoring" is active, it captures a JPEG screenshot every **250ms** and `POST`s it to the backend's `/detect` endpoint (authenticated with an `x-api-key` header).
3. Each response is fed into a "leaky bucket" streak counter: a fall prediction increments the streak, a normal prediction decrements it (floor of 0, cap of 10).
4. When the streak reaches **3**, a full-screen "Fall Detected" alert is shown for 5 seconds.
5. Every 5 seconds, the dashboard polls `/records` to refresh a sidebar list of past confirmed falls.

This streak-based approach smooths out single noisy frames so a brief misclassification doesn't trigger a false alarm on its own.

## Tech stack

- **React 18** + **TypeScript**
- **Vite** — dev server / build tool
- **react-webcam** — camera capture
- **axios** — HTTP client for the backend API
- **lucide-react** — icon set

## Project structure

```
.
├── index.html
├── src/
│   ├── main.tsx        # React entrypoint
│   ├── App.tsx          # Dashboard UI, webcam capture loop, alert/streak logic
│   ├── App.css           # Dashboard styling
│   └── vite-env.d.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .github/workflows/      # CI/CD: Azure Static Web Apps + Azure Web App
```

## Getting started

### Prerequisites

- Node.js 18+ (CI uses Node 22)
- A running instance of the [fall-detection backend](https://github.com/Rajesh-041/backend-falldetection)

### Installation

```bash
git clone https://github.com/Rajesh-041/frontend-falldetection.git
cd frontend-falldetection
npm install
```

### Configuration

The app reads its backend connection details from Vite environment variables, both with hardcoded fallbacks (these should be overridden for any real deployment):

| Variable        | Fallback used if unset                                                              | Description |
|------------------|---------------------------------------------------------------------------------------|--------------|
| `VITE_API_URL`   | `https://backend-falldetection2-r4054stye-rajesh-041s-projects.vercel.app`             | Base URL of the backend API. |
| `VITE_API_KEY`   | `fall-detection-secret-2026`                                                            | Value sent in the `x-api-key` header on every request. Must match the backend's `API_KEY`. |

Create a `.env.local` file in the project root to override them:

```env
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your-secret-key
```

### Running locally

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`. Click **Start Monitoring** and grant camera permissions to begin sending frames to the backend.

### Building for production

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
```

## Deployment

This repo is wired up for multiple targets:

- **Vercel** — `vercel-trigger.txt` is used purely to force fresh redeploys; the project is built with the default Vite static build settings.
- **Azure Static Web Apps** — `.github/workflows/azure-static-web-apps-*.yml` builds the app and deploys the `dist/` output automatically on push to `main`.
- **Azure Web App (Node.js)** — `.github/workflows/main_frontend1.yml` builds and deploys the app as a Node-hosted Azure Web App.

Each CI workflow requires its corresponding secrets (Azure service principal credentials or the Static Web Apps deployment token) to be configured in the repository settings.

## Notes

- The webcam capture loop runs entirely client-side; no video is stored, only individual frames are sent to the backend for inference.
- The default API key in the code is a placeholder and is **not secure** — set real `VITE_API_URL` / `VITE_API_KEY` values (matching the backend's `API_KEY`) before deploying publicly.

## License

No license file is currently included in this repository.
