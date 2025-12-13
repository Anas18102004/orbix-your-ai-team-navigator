/**
 * Feature Flag Middleware
 * 
 * Guards routes behind feature flags.
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireFeatureFlag = (flagName: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const flagValue = process.env[flagName];
    
    if (flagValue !== 'true') {
      return res.status(403).json({
        error: `Feature ${flagName} is not enabled`,
        featureFlag: flagName,
      });
    }

    next();
  };
};

export const requireMeetingsFeature = requireFeatureFlag('FEATURE_MEETINGS');
