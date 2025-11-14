// Authentication middleware

/**
 * Require user to be authenticated
 * Checks if user session exists
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please log in to access this resource'
    });
  }
  next();
}

/**
 * Require user to be a guest (not authenticated)
 * Redirects authenticated users away from login/register pages
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Already logged in'
    });
  }
  next();
}

/**
 * Check if user owns a resource
 * Used to verify user can only modify their own pets
 */
function requireOwnership(userIdFromResource) {
  return (req, res, next) => {
    if (req.session.userId !== userIdFromResource) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireGuest,
  requireOwnership
};
