# Kalshi Predictor v4.0 (Neural Engine)

A completely rebuilt, optimized, and modular version of the Kalshi Predictor.

## 🚀 New Features

### 1. Premium UI Redesign
- **Glassmorphism Aesthetic**: Modern, dark-themed interface with vibrant neon accents.
- **Market Ticker**: Real-time scrolling ticker of active markets.
- **Enhanced Game Cards**: Now showing Expected Value (EV), Injury Impact, and clearer Probability comparisons.

### 2. Advanced Analytics
- **Market Heatmap**: Visualize volume vs. edge to find the best opportunities.
- **Kelly Risk Calculator**: Integrated tool to size your bets based on bankroll and confidence.
- **Real-time Data**: Enhanced integration with ESPN (Injuries) and Google News (Sentiment).

### 3. Optimization
- **Modular Backend**: Refactored service layer for better performance and maintainability.
- **Smart Caching**: Reduces API load while keeping data fresh.
- **One-Click Startup**: Automated setup script for Mac/Linux.

## 🛠 Quick Start

We've made it incredibly easy to get started. Just run the auto-setup script:

```bash
./start_app.sh
```

This script will automatically:
1. Check your Python and Node.js environment.
2. Create a virtual environment and install backend dependencies.
3. Install frontend dependencies.
4. Launch both the Backend and the Electron App.

## 📊 Dashboard Overview

- **Live Market Insights**: Top-level view of market movements.
- **Model Accuracy**: Real-time tracking of the model's performance.
- **Smart Bets**: High-confidence, high-divergence opportunities are highlighted.

## 🔧 Troubleshooting

If you encounter issues:
- **Port Conflicts**: The startup script attempts to clear ports 8000 and 5173.
- **API Limits**: If news/injury data is missing, wait a few minutes as caching will handle retries.

---
*Built with ❤️ for the Prediction Market Community*
