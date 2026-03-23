import { supabase } from "./supabase";

export interface LogUserActionParams {
  actionType: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  branchId?: string | null;
  changes?: any;
  metadata?: any;
}

/**
 * Logs a user action to the database for auditing purposes.
 */
export async function logUserAction(params: LogUserActionParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Attempted to log user action without an authenticated user.");
      return;
    }

    // Store a snapshot of the current user's name/email/role at time of action so audit trails remain
    // useful even if the user is later renamed/deleted/archived.
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, email, role, branch_id")
      .eq("id", user.id)
      .single();

    const userSnapshot = {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      name: profile?.full_name ?? user.email ?? null,
      role: profile?.role ?? null,
      branch_id: profile?.branch_id ?? params.branchId ?? null,
    }

    const metadata = {
      ...params.metadata,
      userSnapshot,
    }

    const { error } = await supabase.from("user_logs").insert({
      user_id: user.id,
      user_email: userSnapshot.email,
      user_name: userSnapshot.name,
      user_role: userSnapshot.role,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      branch_id: params.branchId,
      changes: params.changes,
      metadata,
      // Supplying created_at manually is fine, but Supabase default now() can handle it too.
    });

    if (error) {
       // Using console.table for easier debugging in the user's browser if they check.
       console.error("Supabase User Log Insertion Failed:");
       console.table({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
       });
    } else {
       console.log(`[UserLog] Successfully logged: ${params.actionType}`);
    }

    if (error) {
      console.error("Error inserting user log:", error);
    }
  } catch (err) {
    console.error("Failed to log user action:", err);
  }
}
