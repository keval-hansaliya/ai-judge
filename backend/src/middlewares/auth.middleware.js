import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Read from cookies manually or from Authorization header
    let token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token && req.headers.cookie) {
      const cookieToken = req.headers.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];
      if (cookieToken) {
        token = decodeURIComponent(cookieToken);
      }
    }

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    const decodedToken = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new ApiError(401, "Invalid Access Token: User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
