/**
 * Validates a password.
 * In development mode, we allow weak passwords (length >= 4).
 * In production mode, we enforce strong password requirements.
 */
export const validatePassword = (password) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Strong password criteria: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const isStrong = strongPasswordRegex.test(password);
  
  if (isProd) {
    if (!isStrong) {
      return {
        isValid: false,
        isStrong: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      };
    }
  } else {
    // Development mode: Allow weak passwords, but require a minimum length of 4 characters
    if (!password || password.length < 4) {
      return {
        isValid: false,
        isStrong: false,
        message: "Password must be at least 4 characters long."
      };
    }
  }

  return {
    isValid: true,
    isStrong,
    message: isStrong ? "Strong password." : "Weak password (allowed in development)."
  };
};
