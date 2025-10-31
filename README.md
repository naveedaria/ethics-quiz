# Ethics Quiz Website

An interactive ethics quiz website where participants scan a QR code to join, answer yes/no questions, and receive an ethical theory assignment based on their answers.

## Features

- QR code scanning for easy participant access
- Real-time synchronization using API polling
- Up to 4 participants + 1 quiz master
- Yes/No question format
- Decision tree-based ethical theory assignment
- JSON-based question system
- Admin panel with password protection
- Answer history tracking and theory tallies

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Start the development servers:
```bash
npm run dev
```

This will start the Next.js app on http://localhost:3000

### Running Separately

**Frontend only:**
```bash
cd frontend
npm run dev
```

## Usage

1. Open http://localhost:3000 in your browser
2. Scan the QR code or share the link with participants
3. Open http://localhost:3000/quiz/admin in another tab/window for the quiz master control panel
   - **Admin Password**: `Password123`
4. Participants scan the QR code and enter their name
5. Quiz master clicks "Start Quiz" when ready
6. Participants answer questions in real-time
7. Quiz master advances questions and shows results
8. View answer history and theory tallies in the admin panel table

## Uploading Custom Questions

Questions are stored in `frontend/data/questions.json`. You can modify this file directly and redeploy.

### Question Format

```json
{
  "theories": {
    "theory_name": {
      "name": "Display Name",
      "description": "Theory description"
    }
  },
  "questions": [
    {
      "id": 1,
      "text": "Question text here?",
      "yes": {
        "nextQuestion": 2,
        "theoryPoints": {
          "theory_name": 1
        }
      },
      "no": {
        "nextQuestion": 3,
        "theoryPoints": {
          "theory_name": 1
        }
      }
    }
  ]
}
```

## Project Structure

```
ethics-quiz/
├── frontend/          # Next.js application (deployable to Vercel)
│   ├── app/
│   │   ├── api/       # Serverless API routes
│   │   └── ...        # Pages and components
│   ├── lib/           # Shared utilities and session management
│   └── data/          # Questions JSON file
└── backend/           # (Legacy - not needed for Vercel deployment)
```

## Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless Functions)
- **Real-time**: API polling (1 second intervals)
- **Deployment**: Vercel (single repository)

## Deployment to Vercel

The application is fully serverless and can be deployed entirely on Vercel as a single repository!

### Quick Deploy Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/login (you can use GitHub to sign in)

3. **Import your repository**
   - Click "Add New..." → "Project"
   - Import your GitHub repository (`ethics-quiz`)
   - Vercel will auto-detect it's a Next.js project

4. **Configure Build Settings**
   - **Root Directory**: `frontend` (click "Edit" and set this)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

   **OR** if deploying from root (with `vercel.json`):
   - Leave Root Directory blank
   - Vercel will use the `vercel.json` configuration

5. **Deploy!**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Alternative: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm settings
   - Deploy!

5. **For production deployment**:
   ```bash
   vercel --prod
   ```

### Post-Deployment Checklist

✅ **Verify your app is working:**
- Visit your Vercel URL
- Test the QR code generation
- Test participant joining
- Test admin panel (password: `Password123`)
- Test question locking and countdown

✅ **Share your quiz:**
- The main page URL is your landing page with QR code
- Admin panel: `https://your-project.vercel.app/quiz/admin`

### Important Notes

- **Session State**: Quiz sessions are stored in serverless function memory. Each quiz session is isolated to a single serverless function instance.
- **Scaling**: For multiple concurrent quiz sessions, consider:
  - Using Vercel KV (Redis) for persistent state across function invocations
  - Upgrading to Vercel Pro for better concurrency limits
- **API Routes**: All routes in `frontend/app/api/` are automatically deployed as serverless functions
- **Real-time Updates**: Uses polling (1 second intervals) - works perfectly with serverless functions
- **Data Files**: The `questions.json` file is included in the deployment and read at runtime

### Environment Variables (Optional)

No environment variables required for basic deployment. Optional variables you might want to add:

- `ADMIN_PASSWORD`: Override default admin password (currently hardcoded as `Password123`)

To add environment variables:
1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add variable and redeploy

### Custom Domain

1. Go to your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel handles SSL automatically

### Troubleshooting

**Build fails?**
- Check that `frontend/data/questions.json` exists
- Verify Node.js version (Vercel uses Node 18+ by default)
- Check build logs in Vercel dashboard

**Session not persisting?**
- This is expected with serverless functions
- State resets between deployments or cold starts
- Consider Vercel KV for persistent storage

**API routes not working?**
- Verify routes are in `frontend/app/api/` directory
- Check function logs in Vercel dashboard
- Ensure routes export proper HTTP methods (GET, POST)

### Alternative: Multi-Service Deployment (If Needed)

#### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Configure build settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. Add environment variables (if needed):
   - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://your-backend.railway.app`)
5. Deploy

#### Backend Deployment (Railway or Render)

**Railway:**
1. Go to [Railway](https://railway.app)
2. Create new project and connect GitHub
3. Select your repository
4. Set root directory to `backend`
5. Railway will auto-detect Node.js
6. Add environment variable:
   - `PORT`: `3001` (or let Railway assign)
   - Update CORS origin in `server.js` to your Vercel frontend URL
7. Deploy

**Render:**
1. Go to [Render](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Add environment variable:
   - `PORT`: `3001` (or let Render assign)
   - Update CORS origin in `server.js` to your Vercel frontend URL
6. Deploy

**Update CORS Configuration:**
After deploying, update the backend `server.js` file to allow your frontend domain:

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
```

Add `FRONTEND_URL` environment variable in your hosting platform.

### Option 2: Docker Deployment

1. Create `Dockerfile` in root:

```dockerfile
# Frontend Dockerfile (frontend/Dockerfile)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

2. Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      - backend
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
```

3. Run:
```bash
docker-compose up -d
```

### Option 3: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. SSH into your server
2. Install Node.js and npm
3. Clone your repository
4. Install dependencies:
   ```bash
   npm run install:all
   ```
5. Use PM2 or systemd to run both services:
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start backend
   cd backend
   pm2 start server.js --name ethics-quiz-backend
   
   # Start frontend
   cd ../frontend
   pm2 start npm --name ethics-quiz-frontend -- start
   ```
6. Set up reverse proxy (Nginx) for frontend:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
7. Set up SSL with Let's Encrypt:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Backend (.env):**
```
PORT=3001
FRONTEND_URL=https://your-frontend-url.com
```

### Important Notes

1. **WebSocket Support**: Ensure your hosting platform supports WebSocket connections (Vercel, Railway, Render all do)
2. **CORS**: Update CORS settings to match your production frontend URL
3. **Admin Password**: Currently hardcoded as `Password123`. For production, consider:
   - Moving to environment variable
   - Implementing proper authentication with JWT tokens
   - Using a more secure password
4. **Data Persistence**: The quiz session is stored in memory. To persist data:
   - Add database (MongoDB, PostgreSQL)
   - Store sessions in Redis
5. **Scaling**: For multiple concurrent quiz sessions, consider:
   - Adding Redis for session management
   - Using Socket.io Redis adapter
   - Load balancing WebSocket connections

