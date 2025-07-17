FROM python:3.11-slim

# Set working directory
WORKDIR /app

# MySQL istemci kütüphanelerini ve geliştirme araçlarını yükleyin
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Gerekli paketleri kopyalayın ve yükleyin
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodlarını kopyalayın
COPY . .
# Expose port
EXPOSE 8000

# Run the application using start.py for proper environment setup
CMD ["python", "start.py"]
