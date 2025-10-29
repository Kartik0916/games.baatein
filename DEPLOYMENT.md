# 🚀 Deploy Your Tic Tac Toe Game to Vercel

## ✅ **Backend is Already Deployed!**
Your backend is running at: **https://games-baatein-backend.onrender.com**

## 🌐 **Deploy Frontend to Vercel**

### **Option 1: Quick Deploy with Vercel CLI (Recommended)**

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Done!** Vercel will give you a URL like: `https://your-project-name.vercel.app`

### **Option 2: Deploy via Vercel Dashboard**

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Deploy frontend"
   git push
   ```

2. **Go to Vercel Dashboard**:
   - Visit [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Project**:
   - **Root Directory**: `public` or leave empty
   - **Framework Preset**: Other
   - **Build Command**: (leave empty for static files)
   - **Output Directory**: `public`

4. **Deploy**

## 🔧 **Update Backend CORS**

After deploying to Vercel, update your backend CORS:

1. **Go to Render Dashboard**:
   - [render.com](https://render.com)

2. **Update Environment Variable**:
   ```
   FRONTEND_URL=https://your-actual-vercel-url.vercel.app
   ```

3. **Redeploy** the backend

## 🎮 **Test Your Game**

1. **Open your Vercel URL** in a browser
2. **Enter a username** and choose an avatar
3. **Create a room** or join with a room code
4. **Play Tic Tac Toe!**

## 📱 **Access Your Game**

- **URL**: `https://your-project-name.vercel.app`
- **Backend**: `https://games-baatein-backend.onrender.com`

## 🎯 **Local Development**

If you want to test locally:

1. **Run a local server**:
   ```bash
   # Using Python 3
   cd public
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server public -p 8000
   ```

2. **Open in browser**:
   ```
   http://localhost:8000
   ```

3. **The game will connect to your deployed backend automatically!**

## ✅ **Everything is Ready!**

- ✅ Backend deployed on Render
- ✅ Frontend files ready in `/public` folder
- ✅ WebSocket configured to connect to backend
- ✅ All game functionality working

Just deploy the `public` folder to Vercel and you're done!

