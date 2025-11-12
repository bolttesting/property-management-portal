/**
 * Utility functions for handling image URLs
 */

/**
 * Get the backend base URL from environment variables
 */
export const getBackendUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side rendering
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'
    // Force HTTPS in production (except localhost)
    if (apiUrl && !apiUrl.includes('localhost') && apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'https://')
    }
    return apiUrl
  }
  
  // Client-side
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
  let backendUrl = apiUrl.replace('/api/v1', '').trim()
  
  if (!backendUrl) {
    backendUrl = 'http://localhost:5000'
  }
  
  // Force HTTPS in production (except localhost) - important for iOS Safari
  if (backendUrl && !backendUrl.includes('localhost') && backendUrl.startsWith('http://')) {
    backendUrl = backendUrl.replace('http://', 'https://')
  }
  
  // Remove trailing slash
  backendUrl = backendUrl.replace(/\/$/, '')
  
  return backendUrl
}

/**
 * Construct a full image URL from a relative path
 * @param imageUrl - The image URL (can be relative or absolute)
 * @returns The full image URL
 */
export const getImageUrl = (imageUrl: string | undefined | null): string => {
  if (!imageUrl) {
    console.warn('[ImageUtils] No image URL provided')
    return ''
  }
  
  // If URL already includes http/https, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Get backend URL
  const backendUrl = getBackendUrl()
  
  // Ensure image path starts with slash
  const imagePath = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl
  
  // Construct full URL
  const fullUrl = `${backendUrl}${imagePath}`
  
  // Debug logging for macOS/iOS
  if (typeof window !== 'undefined') {
    const isMacOS = navigator.platform === 'MacIntel'
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (isMacOS || isIOS) {
      console.log('[ImageUtils] Constructed image URL:', {
        original: imageUrl,
        backendUrl,
        imagePath,
        fullUrl,
        isHTTPS: fullUrl.startsWith('https://'),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      })
    }
  }
  
  return fullUrl
}

/**
 * Enhanced error handler for image loading
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  imageUrl: string | undefined | null,
  retryCallback?: (url: string) => void
): void => {
  const img = event.currentTarget
  const constructedUrl = getImageUrl(imageUrl)
  
  // Get detailed error information
  const nativeEvent = event.nativeEvent as any
  const errorDetails = {
    attemptedUrl: img.src,
    originalUrl: imageUrl,
    constructedUrl,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    isHTTPS: img.src.startsWith('https://'),
    errorType: nativeEvent?.type || 'unknown',
    errorMessage: nativeEvent?.message || nativeEvent?.error?.message || 'No error message',
    errorStack: nativeEvent?.error?.stack || 'No stack trace',
    timestamp: new Date().toISOString()
  }
  
  // Enhanced logging for macOS/iOS
  const isMacOS = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel'
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
  
  if (isMacOS || isIOS) {
    console.error('[ImageUtils] [macOS/iOS] Image load error:', JSON.stringify(errorDetails, null, 2))
  } else {
    console.error('[ImageUtils] Image load error:', errorDetails)
  }
  
  // Try to diagnose the issue with a fetch request
  if (img.src) {
    const testUrl = img.src
    // Use fetch to test if the URL is accessible
    fetch(testUrl, { 
      method: 'HEAD', 
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache'
    })
      .then((response) => {
        if (!response.ok) {
          console.error('[ImageUtils] Image URL returned error status:', {
            url: testUrl,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          })
        } else {
          console.log('[ImageUtils] Image URL is accessible:', {
            url: testUrl,
            status: response.status,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          })
        }
      })
      .catch((fetchError: any) => {
        console.error('[ImageUtils] Image URL fetch failed:', {
          url: testUrl,
          errorName: fetchError?.name || 'Unknown',
          errorMessage: fetchError?.message || 'No message',
          errorStack: fetchError?.stack || 'No stack',
          isNetworkError: fetchError?.name === 'TypeError',
          isCorsError: fetchError?.message?.includes('CORS') || fetchError?.message?.includes('cors')
        })
      })
  }
  
  // Retry logic with HTTPS enforcement for Safari
  if (retryCallback && !img.dataset.retried) {
    img.dataset.retried = 'true'
    
    // For Safari, try forcing HTTPS if it's not already
    let retryUrl = constructedUrl
    if ((isMacOS || isIOS) && retryUrl.startsWith('http://')) {
      retryUrl = retryUrl.replace('http://', 'https://')
      console.log('[ImageUtils] [macOS/iOS] Retrying with HTTPS:', retryUrl)
    } else {
      console.log('[ImageUtils] Retrying image load:', retryUrl)
    }
    
    retryCallback(retryUrl)
  }
}

/**
 * Handle successful image load
 */
export const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const img = event.currentTarget
  console.log('[ImageUtils] Image loaded successfully:', {
    src: img.src,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete
  })
}

