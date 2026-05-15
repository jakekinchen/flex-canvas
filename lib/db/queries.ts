import type { User } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Board = {
  id: string;
  owner_id: string;
  name: string;
  room_id: string;
  share_mode: "private" | "link_view" | "link_edit";
  created_at: string;
  updated_at: string;
};

export type BoardRole = "owner" | "editor" | "viewer";

const colors = ["#2563EB", "#DC2626", "#16A34A", "#9333EA", "#EA580C", "#0891B2"];

function fallbackName(user: User) {
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Guest"
  );
}

function colorForUser(userId: string) {
  let total = 0;
  for (const char of userId) total += char.charCodeAt(0);
  return colors[total % colors.length];
}

export async function ensureProfile(user: User): Promise<Profile> {
  const supabase = createServiceSupabaseClient();
  const profile = {
    id: user.id,
    display_name: fallbackName(user),
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    color: colorForUser(user.id),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id", ignoreDuplicates: false })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateProfile(user: User, displayName: string): Promise<Profile> {
  const supabase = createServiceSupabaseClient();
  const profile = {
    id: user.id,
    display_name: displayName.trim() || fallbackName(user),
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    color: colorForUser(user.id),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function listBoardsForUser(userId: string): Promise<Board[]> {
  const supabase = createServiceSupabaseClient();
  const { data: owned, error: ownedError } = await supabase
    .from("boards")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (ownedError) throw ownedError;

  const { data: memberships, error: membershipError } = await supabase
    .from("board_members")
    .select("board_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const memberBoardIds = (memberships ?? []).map((membership) => membership.board_id);
  if (memberBoardIds.length === 0) {
    return (owned ?? []) as Board[];
  }

  const { data: memberBoards, error: memberBoardsError } = await supabase
    .from("boards")
    .select("*")
    .in("id", memberBoardIds)
    .order("updated_at", { ascending: false });

  if (memberBoardsError) throw memberBoardsError;

  const merged = new Map<string, Board>();
  for (const board of [...(owned ?? []), ...(memberBoards ?? [])] as Board[]) {
    merged.set(board.id, board);
  }

  return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createBoard(user: User, name = "Untitled board"): Promise<Board> {
  const supabase = createServiceSupabaseClient();
  await ensureProfile(user);

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      owner_id: user.id,
      name: name.trim() || "Untitled board",
      room_id: `board:${crypto.randomUUID()}`,
      share_mode: "link_edit",
    })
    .select("*")
    .single();

  if (boardError) throw boardError;

  const { error: memberError } = await supabase.from("board_members").insert({
    board_id: board.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw memberError;
  return board as Board;
}

export async function updateBoardName(boardId: string, name: string): Promise<Board> {
  const supabase = createServiceSupabaseClient();
  const trimmedName = name.trim() || "Untitled board";

  const { data, error } = await supabase
    .from("boards")
    .update({
      name: trimmedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boardId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Board;
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("boards").select("*").eq("id", boardId).maybeSingle();
  if (error) throw error;
  return (data as Board | null) ?? null;
}

export async function getBoardByRoomId(roomId: string): Promise<Board | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("boards").select("*").eq("room_id", roomId).maybeSingle();
  if (error) throw error;
  return (data as Board | null) ?? null;
}

export async function getBoardAccess(
  board: Board,
  userId: string,
): Promise<{ canView: boolean; canEdit: boolean; role: BoardRole | "link_view" | "link_edit" | null }> {
  if (board.owner_id === userId) {
    return { canView: true, canEdit: true, role: "owner" };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", board.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data?.role) {
    const role = data.role as BoardRole;
    return { canView: true, canEdit: role !== "viewer", role };
  }

  if (board.share_mode === "link_edit") {
    await supabase
      .from("board_members")
      .upsert({ board_id: board.id, user_id: userId, role: "editor" }, { onConflict: "board_id,user_id" });
    return { canView: true, canEdit: true, role: "link_edit" };
  }

  if (board.share_mode === "link_view") {
    return { canView: true, canEdit: false, role: "link_view" };
  }

  return { canView: false, canEdit: false, role: null };
}

export async function logAiCommandStarted(boardId: string, userId: string, prompt: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ai_command_logs")
    .insert({ board_id: boardId, user_id: userId, prompt, status: "started" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function completeAiCommandLog(
  commandId: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  estimatedCostUsd: number | undefined,
  operations: unknown[],
) {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("ai_command_logs")
    .update({
      status: "completed",
      operation_count: operations.length,
      operations,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
      completed_at: new Date().toISOString(),
    })
    .eq("id", commandId);

  if (error) throw error;
}

export async function failAiCommandLog(commandId: string, errorMessage: string) {
  const supabase = createServiceSupabaseClient();
  await supabase
    .from("ai_command_logs")
    .update({
      status: "failed",
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", commandId);
}
