import { hasPermission } from "../controllers/Authentication/permission.service";

type AuthenticatedRequest = {
  user?: {
    id?: number;
  };
};

type HttpResponse = {
  status: (statusCode: number) => {
    json: (payload: { message: string }) => unknown;
  };
};

type NextFunction = (error?: unknown) => void;

export const requirePermission = (permissionCode: string) => {
  return async (req: AuthenticatedRequest, res: HttpResponse, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allowed = await hasPermission(userId, permissionCode);

      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
