# Development backend — hot reload enabled
# Uses Python 3.11 (NOT 3.14 — better package compatibility)
FROM python:3.11-slim-bookworm

# Set working directory inside container
WORKDIR /app

# Install system dependencies needed for OpenCV and other packages
RUN echo 'Acquire::Check-Valid-Until "false";' >> /etc/apt/apt.conf.d/10no-check-valid-until \
    && echo 'Acquire::Check-Date "false";' >> /etc/apt/apt.conf.d/10no-check-valid-until \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libegl1 \
        libgles2 \
        libgl1-mesa-dri \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgomp1 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker caches this layer — faster rebuilds)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the entire backend code
COPY . .

# Create data directories that the app needs
RUN mkdir -p data/raw_videos data/processed data/avatars data/thumbnails

# Expose the port FastAPI runs on
EXPOSE 8000

# Development command — hot reload with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
