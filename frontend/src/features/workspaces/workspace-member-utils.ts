import type { AssignableWorkspaceMember } from "@/types/workspace";

export const getMemberPrimaryLabel = (
  member: AssignableWorkspaceMember,
): string => {
  const fullName = member.full_name?.trim();
  if (!fullName) return member.email;
  return fullName;
};
