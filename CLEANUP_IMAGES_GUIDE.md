# Image Cleanup Guide

## Problem
Deleting images from the database doesn't delete the actual files from the filesystem. Old images remain accessible via their URLs even after deletion.

## Solution: Use Cleanup Endpoints

### Option 1: Cleanup Orphaned Images (Recommended)
This endpoint deletes files that exist on the filesystem but don't have database records.

**Endpoint:** `POST /api/v1/admin/cleanup/orphaned-images`

**How to Use:**
1. Log in as admin
2. Get your admin token
3. Make a POST request to the cleanup endpoint:

```bash
curl -X POST \
  https://property-management-portal-production.up.railway.app/api/v1/admin/cleanup/orphaned-images \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed. X orphaned image(s) deleted.",
  "data": {
    "totalFiles": 10,
    "dbRecords": 5,
    "orphanedFiles": 5,
    "deletedFiles": 5,
    "orphanedFileNames": ["file1.jpg", "file2.jpg", ...]
  }
}
```

### Option 2: Clear All Property Images (Use with Caution)
This endpoint deletes ALL property images from both filesystem and database.

**Endpoint:** `POST /api/v1/admin/cleanup/all-images`

**How to Use:**
1. Log in as admin
2. Get your admin token
3. Make a POST request with confirmation:

```bash
curl -X POST \
  https://property-management-portal-production.up.railway.app/api/v1/admin/cleanup/all-images \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": "true"}'
```

**⚠️ Warning:** This will delete ALL property images. Use only if you want to clear everything.

**Response:**
```json
{
  "success": true,
  "message": "All property images cleared. X file(s) deleted from filesystem, all database records deleted.",
  "data": {
    "deletedFiles": 10,
    "deletedFileNames": ["file1.jpg", "file2.jpg", ...],
    "deletedRecords": 10
  }
}
```

### Option 3: Delete Individual Property Image
Delete a specific image (removes both file and database record).

**Endpoint:** `DELETE /api/v1/properties/:propertyId/images/:imageId`

**How to Use:**
1. Log in as owner or admin
2. Get your token
3. Make a DELETE request:

```bash
curl -X DELETE \
  https://property-management-portal-production.up.railway.app/api/v1/properties/PROPERTY_ID/images/IMAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Using Postman or Frontend

### Postman
1. Create a new POST request
2. URL: `https://property-management-portal-production.up.railway.app/api/v1/admin/cleanup/orphaned-images`
3. Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`
4. Send request

### Frontend Admin Page (Future)
I can create a frontend admin page with a button to trigger cleanup. Would you like me to create this?

## Quick Steps

1. **Log in as admin** on your application
2. **Get your admin token** from browser localStorage or API response
3. **Call cleanup endpoint** using Postman, curl, or API client
4. **Check response** to see how many files were deleted
5. **Verify** by checking the health endpoint: `imageCount` should decrease

## Expected Results

After cleanup:
- Orphaned image files are deleted from filesystem
- Database records remain (only files without records are deleted)
- `imageCount` in health endpoint decreases
- Old image URLs return 404 (as expected)

## Important Notes

1. **Orphaned Images**: Files that exist but don't have database records are deleted
2. **Active Images**: Images that have database records are NOT deleted
3. **Safety**: The cleanup endpoint only deletes orphaned files, not active ones
4. **Backup**: Consider backing up images before cleanup (if needed)

## Troubleshooting

### Issue: Still seeing old images
- **Solution**: Check if images have database records. If they do, they won't be deleted by the orphaned cleanup.
- **Solution**: Use the clear all images endpoint (with caution) or delete individual images.

### Issue: Can't access cleanup endpoint
- **Check**: You must be logged in as admin
- **Check**: Admin token is valid
- **Check**: Endpoint URL is correct

### Issue: Some images not deleted
- **Check**: File permissions on the filesystem
- **Check**: Railway logs for deletion errors
- **Check**: Images might be in a different directory

## Next Steps

1. ✅ Use cleanup endpoint to remove orphaned images
2. ✅ Verify images are deleted (check health endpoint)
3. ✅ Re-upload new images as needed
4. ✅ Set up Railway Volume for persistent storage
5. ✅ Test image uploads and deletions

