# Troubleshooting: Images Not Showing (404 Errors)

## Quick Diagnosis

### Step 1: Check Health Endpoint

Visit: `https://property-management-portal-production.up.railway.app/health`

Look for the `storage` section:
```json
{
  "status": "ok",
  "storage": {
    "uploadDir": "/data/uploads",  // Should be /data/uploads if Railway Volume is set
    "exists": true,                 // Should be true
    "writable": true,               // Should be true
    "railwayVolume": "/data"        // Should show /data if volume is mounted
  }
}
```

### Step 2: Check Railway Dashboard

1. Go to Railway Dashboard → Your Backend Service
2. Check **Volumes** tab:
   - ✅ Volume should exist
   - ✅ Mount path should be `/data`
3. Check **Variables** tab:
   - ✅ `UPLOAD_DIR` should be set to `/data/uploads`

### Step 3: Check Backend Logs

After redeployment, look for these log messages:
```
✅ Upload directory exists: /data/uploads/images
✅ Upload directory exists: /data/uploads/documents
💾 Railway Volume: /data
```

If you see:
```
💾 Railway Volume: Not configured (ephemeral storage)
```
→ **Railway Volume is NOT set up!**

## Common Issues & Solutions

### Issue 1: "Railway Volume: Not configured"

**Problem**: Railway Volume not created or not mounted.

**Solution**:
1. Go to Railway Dashboard → Backend Service → **Volumes** tab
2. Click **"Create Volume"** or **"Add Volume"**
3. Name: `uploads`
4. Mount path: `/data`
5. Size: 1GB (or more)
6. **Redeploy** the service

### Issue 2: "exists: false" or "writable: false"

**Problem**: Volume exists but directory not accessible.

**Solution**:
1. Check `UPLOAD_DIR` environment variable is set to `/data/uploads`
2. Redeploy the service
3. Check logs for directory creation messages

### Issue 3: Images return 404 but health check shows storage is OK

**Problem**: Old images were uploaded before Railway Volume was set up. Files are lost.

**Solution**:
1. **Re-upload images** through the application
2. Or clean up database references to missing images (see below)

### Issue 4: Images work after upload but disappear after redeployment

**Problem**: Railway Volume not properly configured or not persisting.

**Solution**:
1. Verify volume is created and mounted
2. Check `UPLOAD_DIR` environment variable
3. Test by uploading an image, then redeploying - image should still exist

## Immediate Fix: Re-upload Images

Since old images are lost, you need to:

1. **For Property Dealers**: Re-upload property images through the owner dashboard
2. **For Admins**: Can help re-upload images for properties

## Clean Up Orphaned Image References

If you want to remove database references to missing images, you can run this SQL:

```sql
-- Find properties with missing images
SELECT p.id, p.property_name, pi.image_url
FROM properties p
JOIN property_images pi ON p.id = pi.property_id
WHERE pi.image_url LIKE '/uploads/images/%';

-- Optionally delete orphaned image references (CAREFUL!)
-- DELETE FROM property_images WHERE image_url LIKE '/uploads/images/%';
```

## Verification Steps

1. ✅ Health endpoint shows storage is configured
2. ✅ Railway Volume exists and is mounted
3. ✅ `UPLOAD_DIR` environment variable is set
4. ✅ Backend logs show "Railway Volume: /data"
5. ✅ Upload a test image - it should work
6. ✅ Redeploy - test image should still exist
7. ✅ Images load in browser (no 404 errors)

## Still Not Working?

1. **Check Railway Logs**: Look for errors during startup
2. **Check Health Endpoint**: Verify storage configuration
3. **Test Upload**: Try uploading a new image
4. **Check File Permissions**: Railway volumes should have correct permissions automatically
5. **Contact Support**: If volume is set up but still not working

## Next Steps

Once Railway Volume is set up:
1. ✅ Images will persist across deployments
2. ✅ New uploads will work correctly
3. ✅ Old images need to be re-uploaded (they're lost)
4. ✅ Consider migrating to cloud storage (S3/Cloudinary) for production

