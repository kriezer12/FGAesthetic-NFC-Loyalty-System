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

    const { error } = await supabase.from("user_logs").insert({
      user_id: user.id,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      branch_id: params.branchId,
      changes: params.changes,
      metadata: params.metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting user log:", error);
    }
  } catch (err) {
    console.error("Failed to log user action:", err);
  }
}
