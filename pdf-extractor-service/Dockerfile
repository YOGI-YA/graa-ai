FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pdf processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 10000

CMD ["python", "main.py"]
