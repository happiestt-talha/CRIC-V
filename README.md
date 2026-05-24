# 🏏 CRIC-V — Low-Cost Cricket Officiating & Coaching Software

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10-orange?style=for-the-badge)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Bringing objective, data-driven cricket coaching to grassroots academies — no specialist hardware required.**

[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Repos](#-related-repositories)

</div>

---

## 🎯 The Problem

Elite cricket uses Hawk-Eye, DRS, and multi-camera rigs costing hundreds of thousands of dollars. Grassroots academies and school-level coaches in Pakistan rely on memory and intuition — unable to quantify a bowler's elbow angle, a batsman's front foot consistency, or delivery accuracy over time.

**CRIC-V fills that gap.** Upload a training video, get back biomechanical metrics, shot classification, bowling heatmaps, and coach-ready feedback — all running on a standard laptop CPU.

---

## ✨ Features

### 🧍 Pose Estimation & Biomechanics

- Extracts **33 skeletal keypoints per frame** using MediaPipe Pose
- Computes bat angle, front foot displacement, body rotation, elbow & shoulder angles
- Overlays keypoints on synchronized video playback in the dashboard

### 🏏 Batting Analysis

- Classifies **6 shot types** (cover drive, pull, sweep, cut, straight drive, defensive) using a rule-based engine
- Quantifies bat angle at contact, front foot position relative to the crease, and hip/shoulder rotation

### 🎳 Bowling Analysis

- Detects the **ball release frame** automatically from trajectory data
- Checks elbow angle for ICC compliance
- Maps ball landing coordinates onto a standardized pitch grid via **homography**

### 🎯 Accuracy Heatmaps

- Kernel density estimation over delivery landing coordinates
- Rendered on a standardized pitch diagram — instantly visualize line and length patterns

### ⚽ Ball Detection

- Custom fine-tuned **YOLOv8n** model (`cricket_ball_detector.pt`) at 0.40 confidence threshold
- Identifies ball-contact frames and maps pitch coordinates

### 📊 Coach Dashboard

- Next.js 14 frontend with session management
- Synchronized video playback with SVG keypoint overlays
- Per-session metric charts (Chart.js), heatmap display, coach feedback entry
- Asynchronous processing via **Celery + Redis** — no UI blocking

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│         Next.js 14 · Chart.js · SVG Overlays        │
└───────────────────────┬─────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│                  Application Layer                   │
│        FastAPI · Auth · Session Management          │
└──────────┬────────────────────────┬─────────────────┘
           │ Celery Tasks           │ SQLAlchemy ORM
┌──────────▼──────────┐   ┌────────▼────────────────┐
│    ML Processing    │   │      Data Layer          │
│  MediaPipe Pose     │   │  PostgreSQL 15           │
│  YOLOv8 Ball Det.   │   │  Alembic Migrations      │
│  Shot Classifier    │   │  Video File Storage      │
│  Bowling Analyzer   │   └─────────────────────────┘
│  Heatmap Generator  │
└─────────────────────┘
```

---

## 🛠 Tech Stack

| Component        | Technology           | Version    |
| ---------------- | -------------------- | ---------- |
| Backend API      | FastAPI              | 0.110      |
| Task Queue       | Celery + Redis       | 5.3 / 7.2  |
| Database ORM     | SQLAlchemy + Alembic | 2.0 / 1.13 |
| Database         | PostgreSQL           | 15         |
| Pose Estimation  | MediaPipe            | 0.10       |
| Ball Detection   | YOLOv8 (Ultralytics) | 8.1        |
| Image Processing | OpenCV               | 4.9        |
| Frontend         | Next.js              | 14         |
| Charts           | Chart.js             | 4.4        |
| Language         | Python / Node.js     | 3.11 / 18+ |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Redis

### Backend Setup

```bash
# Clone the backend
git clone https://github.com/happiestt-talha/CRIC-V.git
cd CRIC-V

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your PostgreSQL and Redis credentials

# Run database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn main:app --reload

# In a separate terminal, start Celery worker
celery -A tasks worker --loglevel=info
```

### Frontend Setup

```bash
# Clone the frontend
git clone https://github.com/happiestt-talha/CRIC-V-FE.git
cd CRIC-V-FE

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

---

## 📁 Related Repositories

| Repo                                                      | Description                                        |
| --------------------------------------------------------- | -------------------------------------------------- |
| [CRIC-V](https://github.com/happiestt-talha/CRIC-V)       | ML processing backend (MediaPipe, YOLOv8, FastAPI) |
| [CRIC-V-FE](https://github.com/happiestt-talha/CRIC-V-FE) | Next.js coach dashboard frontend                   |
| [CRIC-V-BE](https://github.com/happiestt-talha/CRIC-V-BE) | API backend services                               |

---

## 📐 Core Processing Modules

1. **Video Ingestion** — FastAPI accepts MP4/AVI/MOV, validates format, enqueues Celery task
2. **Pose Estimation** — MediaPipe extracts 33 landmarks/frame, stored as JSON in PostgreSQL
3. **Ball Detection** — YOLOv8n detects ball per frame, supports contact frame identification
4. **Shot Classification** — Rule-based engine using bat angle + foot displacement + body rotation
5. **Bowling Analysis** — Release frame detection, elbow/shoulder angles, homography pitch mapping
6. **Heatmap Generation** — KDE over delivery coordinates → Base64 PNG → stored in DB

---

## ⚠️ Known Limitations

- File-based processing only (no live streaming)
- Rule-based shot classifier (LSTM not implemented due to dataset constraints)
- Single-player-per-frame assumption
- Validated on indoor footage only — outdoor/floodlit conditions untested
- Small validation dataset (4 test videos, 200+ frames)

---

## 👨‍💻 Authors

- **M Talha Manzoor** — [github.com/happiestt-talha](https://github.com/happiestt-talha)
- **Sameer Akram**

Final Year Project — BSIT, Lahore Garrison University (2025)

---

## ⭐ If this project helped you or you find it interesting, please star it!

> _Making objective cricket coaching accessible to every academy in Pakistan._
