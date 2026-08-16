import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { validatePassword } from '../utils/passwordValidator.js';

// Regex for basic email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Name is required");
  }

  if (!email || !emailRegex.test(email)) {
    throw new ApiError(400, "Valid email is required");
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new ApiError(400, passwordValidation.message);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  res.status(201).json(
    new ApiResponse(
      201, 
      { 
        user,
        passwordStrength: passwordValidation.isStrong ? "strong" : "weak" 
      }, 
      "User registered successfully"
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }
  });

  if (!user) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Set Cookie Options (secure in production)
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  // Set the cookie and return the response
  res.cookie("accessToken", token, cookieOptions);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      },
      "Logged in successfully"
    )
  );
});

export const logout = asyncHandler(async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    expires: new Date(0) // immediately expire
  };

  res.cookie("accessToken", "", cookieOptions);

  res.status(200).json(
    new ApiResponse(200, null, "Logged out successfully")
  );
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, req.user, "Current user details retrieved")
  );
});
