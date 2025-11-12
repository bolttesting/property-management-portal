# Railway Persistent Storage Setup

## Problem

Railway's filesystem is **ephemeral** - files uploaded to the local filesystem are lost when the container restarts or redeploys. This causes 404 errors for images that were previously uploaded.

## Solution: Railway Volumes

Railway Volumes provide persistent storage that survives container restarts and redeployments.

## Setup Instructions

### Step 1: Create a Railway Volume

1. Go to your Railway project dashboard
2. Click on your backend service
3. Click on the **"Volumes"** tab (or **"Storage"** tab)
4. Click **"Create Volume"** or **"Add Volume"**
5. Name it: `uploads` or `storage`
6. Mount path: `/data` (this is the default)
7. Size: At least 1GB (adjust based on your needs)

### Step 2: Configure Environment Variables

In your Railway backend service, add these environment variables:

```bash
# Set the upload directory to use the Railway volume
UPLOAD_DIR=/data/uploads

# Or if Railway automatically sets RAILWAY_VOLUME_MOUNT_PATH:
RAILWAY_VOLUME_MOUNT_PATH=/data
```

### Step 3: Redeploy

After adding the volume and environment variables:

1. **Redeploy** your backend service
2. The backend will automatically create the `uploads/images` and `uploads/documents` directories in the volume

### Step 4: Verify

After redeployment, check the logs to confirm:

```
✅ Upload directory exists: /data/uploads/images
✅ Upload directory exists: /data/uploads/documents
💾 Railway Volume: /data
```

## Alternative: Cloud Storage (Recommended for Production)

For production applications, consider using cloud storage instead of local file storage:

### Options:

1. **AWS S3** - Scalable, reliable, CDN support
2. **Cloudinary** - Image optimization, CDN, transformations
3. **Google Cloud Storage** - Similar to S3
4. **Azure Blob Storage** - Microsoft's cloud storage

### Benefits:

- ✅ Files persist across deployments
- ✅ Scalable (no disk space limits)
- ✅ CDN support (faster image loading)
- ✅ Image optimization
- ✅ Backup and redundancy
- ✅ No volume management needed

### Implementation:

1. Install a cloud storage SDK (e.g., `aws-sdk`, `cloudinary`)
2. Update `upload.controller.ts` to upload to cloud storage
3. Store cloud storage URLs in the database
4. Serve images directly from cloud storage CDN

## Current Status

- ✅ Backend code updated to support Railway Volumes
- ✅ Environment variable configuration ready
- ⚠️ **Action Required**: Create Railway Volume and set `UPLOAD_DIR` environment variable

## Important Notes

1. **Existing Images**: Images uploaded before setting up the volume are lost. You'll need to re-upload them.

2. **Volume Size**: Railway Volumes have size limits based on your plan. Monitor usage and upgrade if needed.

3. **Backup**: Consider backing up important files from the volume regularly.

4. **Migration**: If you have existing images in the database, you may need to:
   - Re-upload images through the application
   - Or migrate existing images to cloud storage

## Troubleshooting

### Images still returning 404

1. Check Railway logs for upload directory path
2. Verify the volume is mounted correctly
3. Verify `UPLOAD_DIR` environment variable is set
4. Check file permissions on the volume

### Volume not mounting

1. Verify the volume is created in Railway
2. Check the mount path matches `RAILWAY_VOLUME_MOUNT_PATH` or `UPLOAD_DIR`
3. Redeploy the service after creating the volume

### Permission errors

1. Railway volumes should have correct permissions by default
2. If issues persist, check Railway documentation for volume permissions

## Next Steps

1. ✅ Create Railway Volume
2. ✅ Set `UPLOAD_DIR` environment variable
3. ✅ Redeploy backend service
4. ✅ Test image uploads
5. ✅ Verify images persist after redeployment

