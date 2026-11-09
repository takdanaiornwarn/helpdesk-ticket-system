
import { useEffect, useRef, useState } from "react";

import {
  getTicketById,
  updateTicket,
  deleteTicket,
} from "../services/api";

import AdminStatusPanel from "./AdminStatusPanel";
import AdminAssignmentPanel from "./AdminAssignmentPanel";

import "./Tickets.css";

// ========================================
// HELPERS
// ========================================

function formatDate(date) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status) {
  return String(status || "UNKNOWN").replaceAll("_", " ");
}

// ========================================
// COMPONENT
// ========================================

function TicketDetails({
  ticketId,
  token,
  user,
  onBack,
  onUpdated,
  onDeleted,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  // Edit
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmInputRef = useRef(null);

  // ========================================
  // LOAD TICKET
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadTicket() {
      setLoading(true);
      setError("");

      try {
        const data = await getTicketById(token, ticketId);

        if (active) {
          setTicket(data);
        }
      } catch (err) {
        if (active) {
          setTicket(null);
          setError(err.message || "Failed to load ticket");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => {
      active = false;
    };
  }, [token, ticketId, refreshKey]);

  // ========================================
  // PERMISSION
  // ========================================

  const isAdmin = user?.role === "ADMIN";

  const ownerId =
    ticket?.createdById ??
    ticket?.createdBy?.id;

  const isOwner =
    ownerId != null &&
    Number(ownerId) === Number(user?.id);

  const canManage = isAdmin || isOwner;

  // ========================================
  // EDIT
  // ========================================

  function startEditing() {
    if (!ticket || !canManage || loading) return;

    setForm({
      title: ticket.title || "",
      description: ticket.description || "",
      priority: ticket.priority || "MEDIUM",
    });

    setFormError("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) return;

    setIsEditing(false);
    setFormError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!ticket || !canManage || saving) return;

    setFormError("");
    setSuccessMessage("");

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || !description) {
      setFormError(
        "Title and description are required"
      );
      return;
    }

    if (title.length > 150) {
      setFormError(
        "Title must not exceed 150 characters"
      );
      return;
    }

    if (description.length > 2000) {
      setFormError(
        "Description must not exceed 2000 characters"
      );
      return;
    }

    if (!["LOW", "MEDIUM", "HIGH"].includes(form.priority)) {
      setFormError("Invalid priority");
      return;
    }

    setSaving(true);

    try {
      await updateTicket(token, ticketId, {
        title,
        description,
        priority: form.priority,
      });

      setIsEditing(false);
      setSuccessMessage("Ticket updated successfully!");

      setRefreshKey((value) => value + 1);
      onUpdated?.();
    } catch (err) {
      setFormError(err.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // DELETE
  // ========================================

  function openDeleteDialog() {
    if (
      !ticket ||
      !canManage ||
      isEditing ||
      loading
    ) {
      return;
    }

    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleting) return;

    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
    setDeleteError("");
  }

  useEffect(() => {
    if (deleteDialogOpen) {
      confirmInputRef.current?.focus();
    }
  }, [deleteDialogOpen]);

  useEffect(() => {
    if (!deleteDialogOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !deleting) {
        setDeleteDialogOpen(false);
        setDeleteConfirmation("");
        setDeleteError("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [deleteDialogOpen, deleting]);

  async function handleConfirmDelete(event) {
    event.preventDefault();

    if (
      !ticket ||
      !canManage ||
      deleting ||
      deleteConfirmation.trim() !== "DELETE"
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteTicket(token, ticket.id);

      setDeleteDialogOpen(false);

      if (onDeleted) {
        onDeleted();
      } else {
        onUpdated?.();
        onBack();
      }
    } catch (err) {
      setDeleteError(
        err.message || "Failed to delete ticket"
      );
    } finally {
      setDeleting(false);
    }
  }

  // ========================================
  // REFRESH
  // ========================================

  function handleRefresh() {
    if (saving || deleting) return;

    setSuccessMessage("");
    setRefreshKey((value) => value + 1);
  }

  function handleStatusChanged() {
    setSuccessMessage(
      "Ticket status updated successfully!"
    );

    setRefreshKey((value) => value + 1);
    onUpdated?.();
  }

  function handleAssignmentChanged() {
    setSuccessMessage(
      "Ticket assignment updated successfully!"
    );

    setRefreshKey((value) => value + 1);
    onUpdated?.();
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="ticket-details-page">
      {/* TOP ACTIONS */}
      <div className="td-actions">
        <button
          type="button"
          className="td-back"
          onClick={onBack}
          disabled={saving || deleting}
        >
          ← Back to Tickets
        </button>

        <div className="td-action-buttons">
          {ticket && !loading && canManage && !isEditing && (
            <>
              <button
                type="button"
                className="td-edit-button"
                onClick={startEditing}
                disabled={deleting}
              >
                Edit Ticket
              </button>

              <button
                type="button"
                className="td-delete-button"
                onClick={openDeleteDialog}
                disabled={deleting}
              >
                Delete Ticket
              </button>
            </>
          )}

          <button
            type="button"
            className="hd-refresh"
            onClick={handleRefresh}
            disabled={loading || saving || deleting}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <section className="tl-panel tl-empty" role="status">
          Loading ticket details...
        </section>
      )}

      {/* ERROR */}
      {!loading && error && (
        <section className="tl-panel">
          <div className="td-error" role="alert">
            <h2>Unable to load ticket</h2>
            <p>{error}</p>

            <button
              type="button"
              className="hd-refresh"
              onClick={handleRefresh}
            >
              Try again
            </button>
          </div>
        </section>
      )}

      {/* SUCCESS */}
      {!loading && !error && successMessage && (
        <div className="tl-success" role="status">
          {successMessage}
        </div>
      )}

      {/* TICKET CONTENT */}
      {!loading && !error && ticket && (
        <>
          <div className="hd-page-heading">
            <div>
              <div className="hd-eyebrow">
                TICKET DETAILS · #{ticket.id}
              </div>

              <h1>{ticket.title}</h1>

              <p>
                Detailed information about this
                support request
              </p>
            </div>
          </div>

          <div className="td-badges">
            <span
              className={`tl-status tl-status-${String(
                ticket.status
              )
                .toLowerCase()
                .replaceAll("_", "-")}`}
            >
              {formatStatus(ticket.status)}
            </span>

            <span
              className={`tl-priority tl-priority-${String(
                ticket.priority || "MEDIUM"
              ).toLowerCase()}`}
            >
              {ticket.priority || "MEDIUM"} Priority
            </span>
          </div>

          {/* EDIT FORM */}
          {isEditing ? (
            <section className="tl-panel td-edit-panel">
              <div className="td-edit-heading">
                <h2>Edit Ticket</h2>

                <p>
                  Update your support request information.
                </p>
              </div>

              <form onSubmit={handleSave}>
                <div className="tl-form-group">
                  <label htmlFor="edit-ticket-title">
                    Title *
                  </label>

                  <input
                    id="edit-ticket-title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleInputChange}
                    maxLength={150}
                    required
                    disabled={saving}
                  />

                  <small>
                    {form.title.length}/150 characters
                  </small>
                </div>

                <div className="tl-form-group">
                  <label htmlFor="edit-ticket-description">
                    Description *
                  </label>

                  <textarea
                    id="edit-ticket-description"
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    rows={6}
                    maxLength={2000}
                    required
                    disabled={saving}
                  />

                  <small>
                    {form.description.length}/2000 characters
                  </small>
                </div>

                <div className="tl-form-group">
                  <label htmlFor="edit-ticket-priority">
                    Priority
                  </label>

                  <select
                    id="edit-ticket-priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleInputChange}
                    disabled={saving}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="td-readonly-note">
                  Category: {ticket.category?.name || "-"}

                  <p>
                    Category changes are not available
                    in this form.
                  </p>
                </div>

                {formError && (
                  <div className="tl-form-error" role="alert">
                    {formError}
                  </div>
                )}

                <div className="tl-form-actions">
                  <button
                    type="button"
                    className="tl-cancel-button"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="hd-refresh"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <>
              {/* TICKET INFORMATION */}
              <div className="td-grid">
                <section className="tl-panel">
                  <h2 className="td-section-heading">
                    Description
                  </h2>

                  <p className="td-description">
                    {ticket.description || "No description"}
                  </p>
                </section>

                <section className="tl-panel">
                  <h2 className="td-section-heading">
                    Ticket Information
                  </h2>

                  <dl className="td-info">
                    <div>
                      <dt>Ticket ID</dt>
                      <dd>#{ticket.id}</dd>
                    </div>

                    <div>
                      <dt>Category</dt>
                      <dd>
                        {ticket.category?.name || "-"}
                      </dd>
                    </div>

                    <div>
                      <dt>Created By</dt>
                      <dd>
                        {ticket.createdBy?.name ||
                          `User #${ticket.createdById ?? "-"}`}
                      </dd>
                    </div>

                    <div>
                      <dt>Assigned To</dt>
                      <dd>
                        {ticket.assignedTo?.name ||
                          (ticket.assignedToId
                            ? `ADMIN #${ticket.assignedToId}`
                            : "Unassigned")}
                      </dd>
                    </div>

                    <div>
                      <dt>Created At</dt>
                      <dd>{formatDate(ticket.createdAt)}</dd>
                    </div>

                    <div>
                      <dt>Updated At</dt>
                      <dd>{formatDate(ticket.updatedAt)}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              {/* ADMIN ONLY */}
              {isAdmin && (
                <>
                  <AdminAssignmentPanel
                    ticket={ticket}
                    token={token}
                    currentUser={user}
                    onChanged={handleAssignmentChanged}
                  />

                  <AdminStatusPanel
                    ticket={ticket}
                    token={token}
                    onChanged={handleStatusChanged}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteDialogOpen && ticket && (
        <div className="td-modal-backdrop">
          <section
            className="td-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
          >
            <div className="td-delete-icon">!</div>

            <h2 id="delete-dialog-title">
              Delete Ticket?
            </h2>

            <p id="delete-dialog-description">
              You are about to permanently delete
              this support ticket:
            </p>

            <div className="td-delete-ticket-info">
              <strong>{ticket.title}</strong>
              <span>Ticket #{ticket.id}</span>
            </div>

            <p className="td-delete-warning">
              This action cannot be undone.
            </p>

            <form onSubmit={handleConfirmDelete}>
              <label
                className="td-delete-label"
                htmlFor="delete-confirmation"
              >
                Type <strong>DELETE</strong> to confirm
              </label>

              <input
                ref={confirmInputRef}
                id="delete-confirmation"
                className="td-delete-input"
                type="text"
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(event.target.value)
                }
                placeholder="DELETE"
                autoComplete="off"
                disabled={deleting}
              />

              {deleteError && (
                <div
                  className="tl-form-error"
                  role="alert"
                >
                  {deleteError}
                </div>
              )}

              <div className="td-modal-actions">
                <button
                  type="button"
                  className="tl-cancel-button"
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="td-confirm-delete"
                  disabled={
                    deleting ||
                    deleteConfirmation.trim() !== "DELETE"
                  }
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Ticket"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default TicketDetails;
