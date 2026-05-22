import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.js';

// Protect routes - Verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeyforecommerce2026_dev_env');

    // Check if user still exists
    const user = await userService.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Grant access and store user details in req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

// Restrict access to specific roles (e.g. 'admin')
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
