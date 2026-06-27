"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { ROLES, Role, getRoleColor, getRoleBg, hasPermission } from "../../../lib/permissions";

interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: Role;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("CRA");
  const [inviteName, setInviteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const P = {
    primary: "#6366F1", primaryLight: "#EEF2FF",
    bg: "#FFFFFF", bgSec: "#F9FAFB", bgTert: "#F3F4F6",
    border: "#E5E7EB", text: "#111827", textSec: "#6B7280", textTert: "#9CA3AF",
    success: "#10B981", successLight: "#ECFDF5",
    danger: "#EF4444", dangerLight: "#FEF2F2",
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (roleData) setCurrentUserRole(roleData.role as Role);

    const { data: allUsers } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (allUsers) setUsers(allUsers as UserRole[]);
    setLoading(false);
  }

  async function addUser() {
    if (!inviteEmail.trim() || !currentUser) return;
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert([{
      user_id: currentUser.id,
      email: inviteEmail.trim(),
      role: inviteRole,
      full_name: inviteName.trim(),
      is_active: true,
    }]);
    if (!error) {
      setMessage(`${inviteEmail} added as ${inviteRole}`);
      setShowInviteModal(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("CRA");
      loadData();
    } else {
      setMessage("Error: " + error.message);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  }

  async function updateRole(userId: string, newRole: Role) {
    await supabase.from("user_roles").update({ role: newRole }).eq("id", userId);
    loadData();
  }

  async function toggleActive(userId: string, current: boolean) {
    await supabase.from("user_roles").update({ is_active: !current }).eq("id", userId);
    loadData();
  }

  const canManage = hasPermission(currentUserRole, "manage_roles");
  const canInvite = hasPermission(currentUserRole, "invite_users");

  return (
    <div style={{ minHeight: "100vh", background: P.bgSec, padding: "1.5rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "600", color: P.text }}>User Management</h1>
            <p style={{ fontSize: "12px", color: P.textSec, marginTop: "2px" }}>
              Manage team members and their roles · {users.length} user{users.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {currentUserRole && (
              <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "20px", background: getRoleBg(currentUserRole), color: getRoleColor(currentUserRole), fontWeight: "500" }}>
                You: {currentUserRole}
              </span>
            )}
            {canInvite && (
              <button onClick={() => setShowInviteModal(true)} style={{ fontSize: "12px", padding: "8px 16px", background: P.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                + Add User
              </button>
            )}
          </div>
        </div>

        {message && (
          <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "12px", background: message.includes("Error") ? P.dangerLight : P.successLight, color: message.includes("Error") ? P.danger : P.success }}>
            {message}
          </div>
        )}

        {/* Role Legend */}
        <div style={{ background: P.bg, border: `0.5px solid ${P.border}`, borderRadius: "12px", padding: "14px", marginBottom: "1rem" }}>
          <p style={{ fontSize: "11px", fontWeight: "500", color: P.textSec, marginBottom: "10px" }}>ROLES</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {ROLES.map(role => (
              <span key={role} style={{ fontSize: "10px", padding: "3px 10px", borderRadius: "20px", background: getRoleBg(role), color: getRoleColor(role), fontWeight: "500" }}>
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div style={{ background: P.bg, border: `0.5px solid ${P.border}`, borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${P.border}` }}>
                {["Name / Email", "Role", "Status", "Added", canManage ? "Actions" : ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "500", color: P.textSec }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: P.textTert }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: P.textTert }}>No users yet — add your first team member.</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: `0.5px solid ${P.bgTert}` }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: "500", color: P.text }}>{u.full_name || "—"}</div>
                    <div style={{ fontSize: "11px", color: P.textSec }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {canManage ? (
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value as Role)}
                        style={{ fontSize: "11px", padding: "4px 8px", border: `0.5px solid ${P.border}`, borderRadius: "6px", background: getRoleBg(u.role), color: getRoleColor(u.role), fontWeight: "500", cursor: "pointer" }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: getRoleBg(u.role), color: getRoleColor(u.role), fontWeight: "500" }}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: u.is_active ? P.successLight : P.bgTert, color: u.is_active ? P.success : P.textSec, fontWeight: "500" }}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: "11px", color: P.textSec }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => toggleActive(u.id, u.is_active)}
                        style={{ fontSize: "10px", padding: "3px 10px", border: `0.5px solid ${P.border}`, borderRadius: "6px", background: "transparent", cursor: "pointer", color: u.is_active ? P.danger : P.success }}>
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permissions Reference */}
        <div style={{ background: P.bg, border: `0.5px solid ${P.border}`, borderRadius: "12px", padding: "14px", marginTop: "1rem" }}>
          <p style={{ fontSize: "11px", fontWeight: "500", color: P.textSec, marginBottom: "10px" }}>PERMISSION MATRIX</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${P.border}` }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: P.textSec, fontWeight: "500" }}>Permission</th>
                  {ROLES.map(r => <th key={r} style={{ padding: "6px 4px", color: getRoleColor(r), fontWeight: "500", textAlign: "center", writingMode: "vertical-rl" as const, transform: "rotate(180deg)", height: "80px" }}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Upload Document", key: "upload_document" },
                  { label: "Submit for Review", key: "submit_document" },
                  { label: "Review Document", key: "review_document" },
                  { label: "Approve Document", key: "approve_document" },
                  { label: "Reject Document", key: "reject_document" },
                  { label: "View Documents", key: "view_document" },
                  { label: "Create Study", key: "create_study" },
                  { label: "Invite Users", key: "invite_users" },
                  { label: "Manage Roles", key: "manage_roles" },
                  { label: "View Audit Trail", key: "view_audit_trail" },
                  { label: "Export Inspection", key: "export_inspection" },
                ].map(({ label, key }, i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? P.bg : P.bgSec }}>
                    <td style={{ padding: "5px 8px", color: P.text, fontWeight: "500" }}>{label}</td>
                    {ROLES.map(r => (
                      <td key={r} style={{ padding: "5px 4px", textAlign: "center" }}>
                        {hasPermission(r, key as any) ? (
                          <span style={{ color: P.success, fontSize: "12px" }}>✓</span>
                        ) : (
                          <span style={{ color: P.bgTert, fontSize: "12px" }}>·</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showInviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: P.bg, borderRadius: "16px", padding: "1.5rem", width: "400px", border: `0.5px solid ${P.border}` }}>
            <h2 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "1rem" }}>Add Team Member</h2>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", color: P.textSec, display: "block", marginBottom: "3px" }}>Full Name</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Jane Smith" style={{ width: "100%", fontSize: "12px", border: `0.5px solid ${P.border}`, borderRadius: "8px", padding: "7px 10px" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", color: P.textSec, display: "block", marginBottom: "3px" }}>Email</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@organization.com" type="email" style={{ width: "100%", fontSize: "12px", border: `0.5px solid ${P.border}`, borderRadius: "8px", padding: "7px 10px" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "11px", color: P.textSec, display: "block", marginBottom: "3px" }}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ width: "100%", fontSize: "12px", border: `0.5px solid ${P.border}`, borderRadius: "8px", padding: "7px 10px" }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowInviteModal(false)} style={{ fontSize: "11px", padding: "6px 14px", border: `0.5px solid ${P.border}`, borderRadius: "8px", background: "transparent", cursor: "pointer" }}>Cancel</button>
              <button onClick={addUser} disabled={saving} style={{ fontSize: "11px", padding: "6px 14px", background: P.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Adding..." : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}