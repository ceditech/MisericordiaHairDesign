import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/src/lib/http/HttpError";
import { requireRole, type AuthContext, type AuthDeps, type RoleRequirement } from "./requireRole";
import { requireUser, type UserContext } from "./requireUser";

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

type UserHandler<C> = (req: NextRequest, user: UserContext, routeCtx: C) => Promise<Response> | Response;

/**
 * Like withAuth, but for any signed-in user (no staff role needed), e.g. a customer
 * reading their own data. The handler must scope its queries to `user.uid`.
 */
export function withUser<C = unknown>(handler: UserHandler<C>, deps?: Pick<AuthDeps, "verifyIdToken">) {
    return async (req: NextRequest, routeCtx: C): Promise<Response> => {
        try {
            const user = await requireUser(req, deps);
            return await handler(req, user, routeCtx);
        } catch (err) {
            if (err instanceof HttpError) {
                return NextResponse.json({ success: false, error: err.message }, { status: err.status });
            }
            throw err;
        }
    };
}
