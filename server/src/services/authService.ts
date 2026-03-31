import jwt from 'jsonwebtoken';
import User from '../models/User';
import config from '../config';
import AppError from '../utils/AppError';
import { IUser, JwtPayload, UserRole } from '../types';

/**
 * Generate a JWT token from user data
 */
const generateToken = (user: IUser): string => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

/**
 * Register a new user
 */
export const register = async (data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  organisation?: string;
}): Promise<{ user: Partial<IUser>; token: string }> => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 409);
  }

  // Create user
  const user = await User.create({
    email: data.email,
    password: data.password,
    name: data.name,
    role: data.role || 'viewer',
    organisation: data.organisation || 'default',
  });

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisation: user.organisation,
    },
    token,
  };
};

/**
 * Login with email and password
 */
export const login = async (
  email: string,
  password: string
): Promise<{ user: Partial<IUser>; token: string }> => {
  // Find user with password field included
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisation: user.organisation,
    },
    token,
  };
};

/**
 * Get user profile by ID
 */
export const getUserById = async (
  userId: string
): Promise<Partial<IUser> | null> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    organisation: user.organisation,
  };
};
