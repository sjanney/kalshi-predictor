# Kalshi Predictor 2.0

## New Features
- **Advanced Analytics**: Enhanced prediction engine with record-based win probability and mock volatility analysis.
- **Smart Dashboard**: New grid layout with sorting (Time, Divergence, Confidence) and filtering.
- **Market Signals**: "Follow" or "Fade" market recommendations based on divergence logic.
- **UI 2.0**: Dark mode first, unified color scheme (Zinc/Emerald), and polished components.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Zustand
- **Backend**: FastAPI + Pandas
- **Desktop**: Electron

## Development
To run the full stack (Backend + Electron):
```bash
./start.sh
```

## QA Checklist
- [ ] **Backend**: Run `pytest backend/tests/` to verify prediction logic.
- [ ] **Dashboard**: Verify games load and show correct team names/records.
- [ ] **Filters**: Test "High Confidence" filter hides low confidence games.
- [ ] **Sorting**: Test sorting by "Divergence" shows highest edge games first.
- [ ] **Electron**: Ensure app launches in window and handles refresh.

## Packaging
To build the executable:
```bash
cd frontend
npm run electron:build
```
Output will be in `frontend/dist/`.

