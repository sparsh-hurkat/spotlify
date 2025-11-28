# GitHub Pages Deployment Guide

## Quick Fix for Blank Page

The blank page issue is usually caused by incorrect deployment. Follow these steps:

## Option 1: Using GitHub Actions (Recommended)

1. **Enable GitHub Pages:**
   - Go to your repository: `Settings` → `Pages`
   - Under "Source", select **"GitHub Actions"** (NOT "Deploy from a branch")
   - Save

2. **Add GitHub Secrets:**
   - Go to: `Settings` → `Secrets and variables` → `Actions`
   - Click "New repository secret" and add:
     - `GEMINI_API_KEY` - Your Google Gemini API key
     - `PINECONE_API_KEY` - Your Pinecone API key  
     - `PINECONE_INDEX_URL` - Your Pinecone index URL

3. **Deploy:**
   - Push your code to the `main` branch
   - Go to the `Actions` tab to see the deployment progress
   - Wait for the workflow to complete (usually 2-3 minutes)
   - Your site will be available at: `https://sparsh-hurkat.github.io/spotlify/`

## Option 2: Manual Deployment (If GitHub Actions doesn't work)

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder:**
   - Go to your repository: `Settings` → `Pages`
   - Under "Source", select **"Deploy from a branch"**
   - Branch: `gh-pages` (create this branch if it doesn't exist)
   - Folder: `/ (root)`
   
3. **Copy dist contents to gh-pages branch:**
   ```bash
   # Create and switch to gh-pages branch
   git checkout --orphan gh-pages
   git rm -rf .
   
   # Copy dist contents
   cp -r dist/* .
   
   # Commit and push
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push -u origin gh-pages
   
   # Switch back to main
   git checkout main
   ```

## Troubleshooting

### Still seeing blank page?

1. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check browser console** - Open DevTools (F12) and look for errors
3. **Verify the deployment:**
   - Check that files are in the correct location
   - Verify the script tag in the deployed HTML points to `/spotlify/assets/...`
4. **Check GitHub Pages settings:**
   - Make sure the source is set correctly
   - Wait a few minutes for changes to propagate

### Common Issues:

- **404 errors for assets**: Make sure `base: '/spotlify/'` is set in `vite.config.ts`
- **Blank page**: Usually means the JavaScript bundle isn't loading - check the Network tab in DevTools
- **CORS errors**: Shouldn't happen with GitHub Pages, but check if API keys are set correctly

## Verify Deployment

After deployment, check:
1. The HTML file should have: `<script src="/spotlify/assets/index-XXXXX.js"></script>`
2. All assets should load from `/spotlify/` path
3. No 404 errors in the browser console

