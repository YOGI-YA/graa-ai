# 🚀 AWS Production Deployment Guide — Graa AI

This guide walks you through deploying **Graa AI** to AWS as a single, self-contained production container without requiring any external microservice.

---

## 🏗️ Architecture Overview

- **Frontend & Backend**: Next.js 16 (App Router) running in a lightweight Node.js standalone Docker container.
- **Database**: PostgreSQL (Neon Serverless or AWS RDS PostgreSQL).
- **Document & PDF Processing**: Completely self-contained:
  - **Client-Side**: In-browser PDF.js extracts Table of Contents and syllabi from files up to **50MB** in ~1.5s, sending lightweight JSON text.
  - **Server-Side**: Native Node.js `pdf-parse` and `mammoth` handle any fallback documents up to 50MB directly in the same container.
  - **No external microservice needed** (saves costs, avoids cold-starts, simplifies architecture).
- **AI Inference**: Groq (`qwen/qwen3.8-27b`) for sub-4-second roadmap generation, with NVIDIA NIM Vision AI fallback.

---

## 🌟 Method 1: AWS App Runner (Recommended)

**AWS App Runner** is the fastest, cleanest, and most reliable way to run containerized Next.js apps on AWS. It handles automatic HTTPS, SSL certificates, load balancing, and auto-scaling automatically.

### Step 1: Connect Your GitHub Repository
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/apprunner).
2. Click **Create an App Runner service**.
3. Under **Source code repository**, choose **Source code repository** and connect your GitHub account.
4. Select the repository: `graa-ai` (branch: `main`).
5. Choose **Automatic deployment** so every push to `main` auto-deploys.

### Step 2: Configure Build Settings
- **Configuration file**: Choose **Configure all settings here**.
- **Runtime**: `Nodejs 20` (or choose **Container image** if building via Dockerfile/ECR).
- **Build command**:
  ```bash
  npx prisma generate && npm run build
  ```
- **Start command**:
  ```bash
  npm start
  ```
- **Port**: `3000`

*(Alternatively, if deploying via Docker, choose **Container registry** -> select your ECR image or let App Runner build from the repository `Dockerfile` directly).*

### Step 3: Add Production Environment Variables
Under **Environment variables**, add:

| Variable | Recommended Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | Your Neon DB or AWS RDS PostgreSQL connection string |
| `NEXTAUTH_SECRET` | 32+ character random hex string (e.g. run `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | `https://your-apprunner-url.awsapprunner.com` (or your custom domain) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-apprunner-url.awsapprunner.com` (or your custom domain) |
| `GROQ_API_KEY_1` | Your Groq API key |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` |
| `NVIDIA_API_KEY` | Your NVIDIA API key |
| `NVIDIA_MODEL` | `meta/llama-3.2-11b-vision-instruct` |
| `EMBEDDINGS_API_URL` | `https://api.jina.ai/v1/embeddings` |
| `EMBEDDINGS_API_KEY_1`| Your Jina AI key |
| `EMBEDDINGS_MODEL` | `jina-embeddings-v3` |
| `EMBEDDING_DIM` | `384` |

### Step 4: Deploy
1. Click **Create & Deploy**.
2. App Runner will provision your service, configure SSL, and provide you with a live HTTPS URL in 3–5 minutes!

---

## 🐳 Method 2: AWS Lightsail / EC2 (Fixed Cost $5–$10/mo)

If you prefer a simple virtual private server (VPS) with Docker Compose:

### 1. Launch a Lightsail or EC2 Instance
- OS: **Ubuntu 24.04 LTS**
- Instance size: **1 GB RAM or 2 GB RAM** ($5 to $10/month)
- Open ports: `80` (HTTP), `443` (HTTPS), `22` (SSH)

### 2. Connect & Install Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
```

### 3. Clone Repository & Setup Environment
```bash
git clone https://github.com/YOGI-YA/graa-ai.git
cd graa-ai/graa-ai
cp .env.example .env
nano .env # Paste your production keys
```

### 4. Push Database Schema & Build Container
```bash
npx prisma db push
docker-compose up -d --build
```

### 5. Setup SSL via Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
Add Nginx reverse proxy configuration pointing `location /` to `http://localhost:3000`:
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```
Run `sudo certbot --nginx -d yourdomain.com` for free SSL.

---

## ✅ Post-Deployment Verification Checklist

1. [ ] **Visit Homepage**: Ensure the landing page loads over HTTPS.
2. [ ] **Authentication**: Register a new user and log in to verify NextAuth database sessions.
3. [ ] **Curriculum Upload**: Upload a 5MB–10MB PDF textbook and verify the interactive "Behind the Scenes" engine synthesizes a roadmap in ~3–5 seconds.
4. [ ] **Roadmap Day View**: Open a generated day and verify video lessons, quiz, and practice labs load accurately.
5. [ ] **Overall Performance**: Navigate to `/dashboard/performance` to verify cross-goal analytics.
