# Railway Volume Quick Setup Guide

## Current Status
✅ Storage is working (`exists: true`, `writable: true`)
❌ Railway Volume is NOT configured (`railwayVolume: null`)
⚠️ Images will be LOST on redeployment (ephemeral storage)

## Quick Fix: Set Up Railway Volume

### Step 1: Create Railway Volume
1. Go to **Railway Dashboard** → Your Backend Service
2. Click on **"Volumes"** tab (or **"Storage"** tab)
3. Click **"Create Volume"** or **"Add Volume"**
4. Configure:
   - **Name**: `uploads` (or any name you prefer)
   - **Mount Path**: `/data` (this is the default)
   - **Size**: `1GB` (or more, depending on your needs)
5. Click **"Create"**

### Step 2: Set Environment Variable
1. Go to **Railway Dashboard** → Your Backend Service → **Variables** tab
2. Add new environment variable:
   - **Key**: `UPLOAD_DIR`
   - **Value**: `/data/uploads`
3. Click **"Add"**

### Step 3: Redeploy
1. Railway will automatically redeploy after adding the volume and environment variable
2. Wait for deployment to complete
3. Check health endpoint again: `https://property-management-portal-production.up.railway.app/health`

### Step 4: Verify
After redeployment, check the health endpoint. You should see:
```json
{
  "storage": {
    "uploadDir": "/data/uploads",
    "railwayVolume": "/data",
    "uploadDirEnv": "/data/uploads"
  }
}
```

**Key changes:**
- `railwayVolume` should show `/data` (not `null`)
- `uploadDir` should be `/data/uploads` (not `/app/uploads`)
- `uploadDirEnv` should be `/data/uploads` (not `./uploads`)

## What Happens After Setup

### Before (Current - Ephemeral Storage):
- ✅ Images upload successfully
- ❌ Images are lost on redeployment
- ❌ Images are lost on container restart
- ❌ Storage path: `/app/uploads` (temporary)

### After (With Railway Volume - Persistent Storage):
- ✅ Images upload successfully
- ✅ Images persist across deployments
- ✅ Images persist across container restarts
- ✅ Storage path: `/data/uploads` (persistent volume)

## Important Notes

1. **Existing Images**: Images uploaded before setting up Railway Volume are already lost. You'll need to re-upload them.

2. **Volume Size**: Railway Volumes have size limits based on your plan. Monitor usage and upgrade if needed.

3. **Backup**: Consider backing up important files from the volume regularly.

4. **Testing**: After setup, upload a test image, then redeploy. The image should still exist.

## Troubleshooting

### Issue: `railwayVolume` is still `null` after setup
- **Solution**: Check that the volume is created and mounted at `/data`
- **Solution**: Verify `UPLOAD_DIR` environment variable is set to `/data/uploads`
- **Solution**: Redeploy the service

### Issue: `exists: false` or `writable: false`
- **Solution**: Check that the volume is created correctly
- **Solution**: Verify file permissions on the volume
- **Solution**: Check Railway logs for errors

### Issue: Images still return 404
- **Solution**: Old images are lost - you need to re-upload them
- **Solution**: Verify new uploads work after Railway Volume is set up
- **Solution**: Check that `UPLOAD_DIR` is correctly set

## Next Steps

1. ✅ Create Railway Volume
2. ✅ Set `UPLOAD_DIR` environment variable
3. ✅ Redeploy service
4. ✅ Verify health endpoint shows `railwayVolume: "/data"`
5. ✅ Re-upload property images (old ones are lost)
6. ✅ Test: Upload image → Redeploy → Image should still exist

## Alternative: Cloud Storage (Future)

For production, consider using cloud storage instead:
- **AWS S3** - Scalable, reliable, CDN support
- **Cloudinary** - Image optimization, CDN, transformations
- **Google Cloud Storage** - Similar to S3
- **Azure Blob Storage** - Microsoft's cloud storage

Benefits:
- ✅ No volume management
- ✅ Unlimited storage
- ✅ CDN support (faster image loading)
- ✅ Image optimization
- ✅ Backup and redundancy

