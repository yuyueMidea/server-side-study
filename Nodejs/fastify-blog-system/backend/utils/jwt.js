// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export const jwtConfig = {
  secret: JWT_SECRET,
  sign: {
    expiresIn: JWT_EXPIRES_IN,
  },
};

export function getUserFromToken(request) {
  try {
    return request.user;
  } catch {
    return null;
  }
}
