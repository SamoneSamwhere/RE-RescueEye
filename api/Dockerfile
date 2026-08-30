FROM python:3.11-slim

# System deps — ffmpeg for MJPEG stream
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Copy model weights if present (optional — will fall back to COCO pretrained)
# COPY models/ /app/models/

# Copy demo feed if present (optional — will use synthetic fallback)
# COPY data/demo_feed.mp4 /data/demo_feed.mp4

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
