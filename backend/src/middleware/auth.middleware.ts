import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userType: string;
    email?: string;
    mobile?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      userType: string;
    };

    // Verify user exists and is active
    const userResult = await query(
      'SELECT id, email, mobile, user_type, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 401);
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      throw new AppError('User account is not active', 401);
    }

    req.user = {
      id: user.id,
      userType: user.user_type,
      email: user.email,
      mobile: user.mobile,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Not authenticated', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

