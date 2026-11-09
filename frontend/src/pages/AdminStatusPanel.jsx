
import { useEffect, useState } from "react";

import {
  updateTicketStatus,
  getTicketHistory,
} from "../services/api";

import "./AdminStatusPanel.css";

const STATUSES = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

function formatStatus(status) {
  return String(status || "-").replaceAll("_", " ");
}

function formatDate(date) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AdminStatusPanel({ ticket, token, onChanged }) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [histories, setHistories] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);

  const currentSelection = selectedStatus || ticket.status;
  const isSameStatus = currentSelection === ticket.status;

  // ========================================
  // LOAD TICKET HISTORY
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const data = await getTicketHistory(
          token,
          ticket.id
        );

        if (active) {
          setHistories(data);
        }
      } catch (err) {
        if (active) {
          setHistoryError(
            err.message || "Failed to load history"
          );
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [token, ticket.id, historyVersion]);

  // ========================================
  // SAVE STATUS
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || isSameStatus) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateTicketStatus(
        token,
        ticket.id,
        currentSelection,
        note
      );

      setSuccess("Ticket status updated successfully!");
      setSelectedStatus("");
      setNote("");

      // Reload history from PostgreSQL
      setHistoryVersion((value) => value + 1);

      // Reload ticket details and dashboard
      onChanged?.();
    } catch (err) {
      setError(
        err.message || "Failed to update ticket status"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-status-container">
      {/* STATUS MANAGEMENT */}
      <section className="tl-panel">
        <div className="as-heading">
          <div>
            <span className="as-eyebrow">
              ADMIN MANAGEMENT
            </span>

            <h2>Manage Ticket Status</h2>

            <p>
              Change the ticket status and record
              the reason for the change.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="as-form-group">
            <label>Current Status</label>

            <span className="as-current-status">
              {formatStatus(ticket.status)}
            </span>
          </div>

          <div className="as-form-group">
            <label htmlFor="admin-ticket-status">
              New Status
            </label>

            <select
              id="admin-ticket-status"
              value={currentSelection}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              {STATUSES.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="as-form-group">
            <label htmlFor="admin-status-note">
              Note (Optional)
            </label>

            <textarea
              id="admin-status-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Reason for changing ticket status..."
              disabled={saving}
            />

            <small>{note.length}/500 characters</small>
          </div>

          {error && (
            <div className="as-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="as-success" role="status">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="hd-refresh"
            disabled={saving || isSameStatus}
          >
            {saving ? "Updating..." : "Update Status"}
          </button>
        </form>
      </section>

      {/* TICKET STATUS HISTORY */}
      <section className="tl-panel">
        <div className="as-history-header">
          <div>
            <h2>Status History</h2>
            <p>
              Recorded changes to this ticket
            </p>
          </div>

          <button
            type="button"
            className="as-refresh-button"
            disabled={historyLoading}
            onClick={() => {
              setHistoryVersion((value) => value + 1);
            }}
          >
            Refresh History
          </button>
        </div>

        {historyLoading ? (
          <p className="as-muted" role="status">
            Loading history...
          </p>
        ) : historyError ? (
          <div className="as-error" role="alert">
            {historyError}
          </div>
        ) : histories.length === 0 ? (
          <p className="as-muted">
            No status changes recorded yet.
          </p>
        ) : (
          <div className="as-history-list">
            {histories.map((history) => (
              <div
                key={history.id}
                className="as-history-item"
              >
                <div className="as-history-change">
                  <strong>
                    {formatStatus(history.oldStatus)}
                  </strong>

                  <span aria-hidden="true">→</span>

                  <strong>
                    {formatStatus(history.newStatus)}
                  </strong>
                </div>

                <div className="as-history-meta">
                  <span>
                    {formatDate(history.createdAt)}
                  </span>

                  <span>
                    Changed by User #{history.actorId}
                  </span>
                </div>

                {history.note && (
                  <p className="as-history-note">
                    {history.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminStatusPanel;
