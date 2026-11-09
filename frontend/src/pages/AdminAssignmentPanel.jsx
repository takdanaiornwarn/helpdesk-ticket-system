
import { useState } from "react";

import { assignTicket } from "../services/api";

import "./AdminAssignmentPanel.css";

// ========================================
// ADMIN ASSIGNMENT PANEL
// STEP 13.6.2
// ========================================

function AdminAssignmentPanel({
  ticket,
  token,
  currentUser,
  onChanged,
}) {
  const [adminId, setAdminId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // GET CURRENT ASSIGNED ADMIN
  // Support both assignedToId and assignedTo
  // ========================================

  const assignedUser = ticket.assignedTo ?? null;

  const rawAssignedId =
    assignedUser?.id ??
    ticket.assignedToId ??
    null;

  const currentAssignedId =
    rawAssignedId !== null &&
    Number.isSafeInteger(Number(rawAssignedId)) &&
    Number(rawAssignedId) > 0
      ? Number(rawAssignedId)
      : null;

  const isAssigned =
    currentAssignedId !== null ||
    Boolean(assignedUser);

  const assignedName =
    assignedUser?.name ||
    (currentAssignedId !== null
      ? `ADMIN #${currentAssignedId}`
      : "Unassigned");

  // ========================================
  // VALIDATE INPUT
  // ========================================

  const trimmedId = adminId.trim();
  const parsedId = Number(trimmedId);

  const validAdminId =
    trimmedId !== "" &&
    Number.isSafeInteger(parsedId) &&
    parsedId > 0;

  const sameAdmin =
    validAdminId &&
    currentAssignedId !== null &&
    parsedId === currentAssignedId;

  // ========================================
  // INPUT HANDLERS
  // ========================================

  function handleAdminIdChange(event) {
    setAdminId(event.target.value);
    setError("");
    setSuccess("");
  }

  function handleUseMyAdminId() {
    setAdminId(String(currentUser.id));
    setError("");
    setSuccess("");
  }

  // ========================================
  // ASSIGN / REASSIGN
  // ========================================

  async function handleAssign(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    if (!validAdminId) {
      setError("Enter a valid ADMIN User ID");
      return;
    }

    if (sameAdmin) {
      setError(
        "This ticket is already assigned to that ADMIN"
      );
      return;
    }

    setSaving(true);

    try {
      await assignTicket(
        token,
        ticket.id,
        parsedId
      );

      setSuccess(
        isAssigned
          ? "Ticket reassigned successfully!"
          : "Ticket assigned successfully!"
      );

      setAdminId("");

      // Reload details and dashboard
      onChanged?.();
    } catch (err) {
      setError(
        err.message || "Failed to assign ticket"
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // UNASSIGN
  // ========================================

  async function handleUnassign() {
    if (saving || !isAssigned) return;

    const confirmed = window.confirm(
      `Unassign Ticket #${ticket.id}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await assignTicket(token, ticket.id, null);

      setSuccess("Ticket unassigned successfully!");
      setAdminId("");

      onChanged?.();
    } catch (err) {
      setError(
        err.message || "Failed to unassign ticket"
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="tl-panel aa-panel">
      <div className="aa-heading">
        <span className="as-eyebrow">
          ADMIN MANAGEMENT
        </span>

        <h2>Ticket Assignment</h2>

        <p>
          Assign or reassign this ticket to an ADMIN.
        </p>
      </div>

      {/* CURRENT ASSIGNMENT */}
      <div className="aa-current-box">
        <span className="aa-label">
          Currently Assigned To
        </span>

        {isAssigned ? (
          <>
            <strong>{assignedName}</strong>

            <small>
              {currentAssignedId !== null
                ? `ADMIN User ID: ${currentAssignedId}`
                : "ADMIN User ID not provided by API"}
            </small>
          </>
        ) : (
          <strong className="aa-unassigned">
            Unassigned
          </strong>
        )}
      </div>

      {/* ASSIGNMENT FORM */}
      <form onSubmit={handleAssign}>
        <div className="aa-form-group">
          <label htmlFor="assign-admin-id">
            ADMIN User ID
          </label>

          <input
            id="assign-admin-id"
            type="number"
            min="1"
            step="1"
            placeholder="Enter ADMIN User ID (e.g. 7)"
            value={adminId}
            onChange={handleAdminIdChange}
            disabled={saving}
            required
          />

          <small>
            Enter an existing ADMIN User ID.
            The Backend verifies the selected user.
          </small>
        </div>

        <button
          type="button"
          className="aa-self-button"
          onClick={handleUseMyAdminId}
          disabled={saving}
        >
          Use My ADMIN ID ({currentUser.id})
        </button>

        {error && (
          <div className="aa-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="aa-success" role="status">
            {success}
          </div>
        )}

        <div className="aa-actions">
          <button
            type="submit"
            className="hd-refresh"
            disabled={
              saving ||
              !validAdminId ||
              sameAdmin
            }
          >
            {saving
              ? "Saving..."
              : isAssigned
                ? "Reassign Ticket"
                : "Assign Ticket"}
          </button>

          {isAssigned && (
            <button
              type="button"
              className="aa-unassign-button"
              onClick={handleUnassign}
              disabled={saving}
            >
              Unassign
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default AdminAssignmentPanel;
