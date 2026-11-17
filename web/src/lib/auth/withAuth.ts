import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/src/lib/http/HttpError";
import { requireRole, type AuthContext, type AuthDeps, type RoleRequirement } from "./requireRole";

type AuthedHandler<C> = (req: NextRequest, auth: AuthContext, routeCtx: C) => Promise<Response> | Response;

/**
 * Wraps a route handler so it only runs for callers that satisfy `allowed`.
 * HttpErrors (from the guard or the handler) become JSON responses of the form
 * `{ success: false, error }`; unexpected errors are rethrown for the route's
 * own error handling.
 *
 *   export const POST = withAuth(["owner", "admin"], async (req, auth) => { ... });
 */
export function withAuth<C = unknown>(allowed: RoleRequirement[], handler: AuthedHandler<C>, deps?: AuthDeps) {
    return async (req: NextRequest, routeCtx: C): Promise<Response> => {
        try {
            const auth = await requireRole(req, allowed, deps);
            return await handler(req, auth, routeCtx);
        } catch (err) {
            if (err instanceof HttpError) {
                return NextResponse.json({ success: false, error: err.message }, { status: err.status });
            }
            throw err;
        }
    };
}
