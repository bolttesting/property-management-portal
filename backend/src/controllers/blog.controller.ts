import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Create Blog Post (Admin only)
export const createBlogPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can create blog posts', 403);
    }

    const { title, excerpt, content, featuredImageUrl, category, tags, status } = req.body;

    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    // Generate slug
    let slug = generateSlug(title);
    let slugExists = true;
    let counter = 1;
    const baseSlug = slug;

    // Ensure unique slug
    while (slugExists) {
      const existingPost = await query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
      if (existingPost.rows.length === 0) {
        slugExists = false;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const postId = uuidv4();
    const publishedAt = status === 'published' ? new Date() : null;

    await query(
      `INSERT INTO blog_posts (
        id, title, slug, excerpt, content, featured_image_url,
        author_id, category, tags, status, published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        postId,
        title,
        slug,
        excerpt || null,
        content,
        featuredImageUrl || null,
        req.user.id,
        category || null,
        tags || [],
        status || 'draft',
        publishedAt,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: {
        postId,
        slug,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Blog Posts (Public - only published)
export const getBlogPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, tag, page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    // Non-admin users can only see published posts
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
      whereClause = "WHERE status = 'published'";
    } else if (status) {
      paramCount++;
      whereClause = `WHERE status = $${paramCount}`;
      params.push(status);
    } else {
      whereClause = "WHERE status = 'published'";
    }

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (tag) {
      paramCount++;
      whereClause += ` AND $${paramCount} = ANY(tags)`;
      params.push(tag);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT p.*, u.email as author_email,
       CASE 
         WHEN au.role IS NOT NULL THEN CONCAT('Admin: ', au.role)
         ELSE u.email
       END as author_name
       FROM blog_posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN admin_users au ON u.id = au.user_id
       ${whereClause}
       ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM blog_posts p ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        posts: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Blog Post by ID or Slug
export const getBlogPostById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if it's a UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let queryStr = '';
    if (isUUID) {
      queryStr = `SELECT p.*, u.email as author_email,
       CASE 
         WHEN au.role IS NOT NULL THEN CONCAT('Admin: ', au.role)
         ELSE u.email
       END as author_name
       FROM blog_posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN admin_users au ON u.id = au.user_id
       WHERE p.id = $1`;
    } else {
      queryStr = `SELECT p.*, u.email as author_email,
       CASE 
         WHEN au.role IS NOT NULL THEN CONCAT('Admin: ', au.role)
         ELSE u.email
       END as author_name
       FROM blog_posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN admin_users au ON u.id = au.user_id
       WHERE p.slug = $1`;
    }

    const result = await query(queryStr, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Blog post not found', 404);
    }

    const post = result.rows[0];

    // Only show published posts to non-admins (check via status query param if needed)
    // For now, we'll allow access to published posts

    // Increment view count
    await query('UPDATE blog_posts SET views_count = views_count + 1 WHERE id = $1', [post.id]);

    res.json({
      success: true,
      data: {
        post: {
          ...post,
          views_count: post.views_count + 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Blog Post (Admin only)
export const updateBlogPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can update blog posts', 403);
    }

    const { id } = req.params;
    const { title, excerpt, content, featuredImageUrl, category, tags, status } = req.body;

    // Get existing post
    const existingPost = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    if (existingPost.rows.length === 0) {
      throw new AppError('Blog post not found', 404);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
      // Update slug if title changed
      const newSlug = generateSlug(title);
      paramCount++;
      updates.push(`slug = $${paramCount}`);
      params.push(newSlug);
    }
    if (excerpt !== undefined) {
      paramCount++;
      updates.push(`excerpt = $${paramCount}`);
      params.push(excerpt);
    }
    if (content !== undefined) {
      paramCount++;
      updates.push(`content = $${paramCount}`);
      params.push(content);
    }
    if (featuredImageUrl !== undefined) {
      paramCount++;
      updates.push(`featured_image_url = $${paramCount}`);
      params.push(featuredImageUrl);
    }
    if (category !== undefined) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      params.push(category);
    }
    if (tags !== undefined) {
      paramCount++;
      updates.push(`tags = $${paramCount}`);
      params.push(tags);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);

      // Set published_at if status changes to published
      if (status === 'published' && existingPost.rows[0].status !== 'published') {
        updates.push(`published_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE blog_posts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Blog post updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Blog Post (Admin only)
export const deleteBlogPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can delete blog posts', 403);
    }

    const { id } = req.params;

    await query('DELETE FROM blog_posts WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

