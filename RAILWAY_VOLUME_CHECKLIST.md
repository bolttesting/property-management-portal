# Railway Volume Setup Checklist

## ✅ Current Status
- [x] Health endpoint working
- [x] Storage exists and writable
- [x] Database connected
- [x] Links working
- [ ] Railway Volume configured
- [ ] Persistent storage enabled
- [ ] Images uploaded (after volume setup)

## 📋 Setup Checklist

### Step 1: Create Railway Volume
- [ ] Go to Railway Dashboard → Backend Service
- [ ] Click "Volumes" tab
- [ ] Click "Create Volume"
- [ ] Name: `uploads`
- [ ] Mount Path: `/data`
- [ ] Size: `1GB` (or more)
- [ ] Click "Create"

### Step 2: Set Environment Variable
- [ ] Go to "Variables" tab
- [ ] Click "Add Variable"
- [ ] Key: `UPLOAD_DIR`
- [ ] Value: `/data/uploads`
- [ ] Click "Add"

### Step 3: Verify
- [ ] Wait for Railway to redeploy
- [ ] Check health endpoint: `https://property-management-portal-production.up.railway.app/health`
- [ ] Verify `railwayVolume` shows `/data` (not `null`)
- [ ] Verify `uploadDir` shows `/data/uploads` (not `/app/uploads`)

### Step 4: Re-upload Images
- [ ] Log in as Property Dealer
- [ ] Go to Properties page
- [ ] Re-upload property images
- [ ] Verify images load correctly
- [ ] Check `imageCount` in health endpoint (should increase)

### Step 5: Test Persistence
- [ ] Upload a test image
- [ ] Verify image loads in browser
- [ ] Redeploy service (or wait for next deployment)
- [ ] Verify image still exists after redeployment
- [ ] Check `imageCount` in health endpoint (should remain the same)

## 🎯 Success Criteria

After setup, the health endpoint should show:
```json
{
  "storage": {
    "uploadDir": "/data/uploads",
    "railwayVolume": "/data",        // ✅ Should show /data
    "uploadDirEnv": "/data/uploads", // ✅ Should show /data/uploads
    "imageCount": 0                  // Will increase as you upload
  }
}
```

## ⚠️ Important Notes

1. **Existing Images**: Images uploaded before setting up Railway Volume are **lost**. You need to re-upload them.

2. **Image Count**: `imageCount: 0` means no images are currently stored. This is expected if:
   - Images were lost during deployment
   - No images have been uploaded yet
   - Images are in a different location

3. **Persistence**: After setting up Railway Volume, images will persist across deployments and container restarts.

4. **Storage Limit**: Railway Volumes have size limits based on your plan. Monitor usage and upgrade if needed.

## 🔍 Troubleshooting

### Issue: `railwayVolume` is still `null`
- **Check**: Volume is created in Railway Dashboard
- **Check**: `UPLOAD_DIR` environment variable is set to `/data/uploads`
- **Solution**: Redeploy service after setting up volume and environment variable

### Issue: `imageCount` is still `0` after uploading
- **Check**: Images are uploaded to the correct directory
- **Check**: Images are saved with correct file extensions (`.jpg`, `.png`, etc.)
- **Check**: File permissions on the volume
- **Solution**: Check Railway logs for upload errors

### Issue: Images return 404 after redeployment
- **Check**: Railway Volume is configured correctly
- **Check**: `UPLOAD_DIR` environment variable is set
- **Check**: Images exist in the volume (check `imageCount` in health endpoint)
- **Solution**: Re-upload images after setting up Railway Volume

## 📊 Monitoring

After setup, monitor:
- `imageCount` in health endpoint (should increase as images are uploaded)
- `railwayVolume` in health endpoint (should show `/data`)
- Storage usage in Railway Dashboard
- Image loading in frontend (should work without 404 errors)

## ✅ Next Steps

1. ✅ Set up Railway Volume
2. ✅ Set `UPLOAD_DIR` environment variable
3. ✅ Redeploy service
4. ✅ Verify health endpoint shows `railwayVolume: "/data"`
5. ✅ Re-upload property images
6. ✅ Test image persistence (upload, then redeploy)
7. ✅ Monitor storage usage

