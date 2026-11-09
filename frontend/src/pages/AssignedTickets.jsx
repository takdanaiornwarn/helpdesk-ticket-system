
import { useEffect, useState } from "react";

import { getAssignedTickets } from "../services/api";

import "./AssignedTickets.css";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AssignedTickets({
  token,
  onOpenTicket,
  refreshVersion,
}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localRefresh, setLocalRefresh] = useState(0);

  // ========================================
  // LOAD ASSIGNED TICKETS
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadAssignedTickets() {
      setLoading(true);
      setError("");

      try {
        const data = await getAssignedTickets(token);

        if (active) {
          setTickets(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load assigned tickets"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAssignedTickets();

    return () => {
      active = false;
    };
  }, [token, refreshVersion, localRefresh]);

  const sortedTickets = [...tickets].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="assigned-page">
      <div className="hd-page-heading">
        <div>
          <div className="hd-eyebrow">
            ADMIN WORKSPACE
          </div>

          <h1>Assigned to Me</h1>

          <p>
            Support tickets currently assigned to your
            ADMIN account.
          </p>
        </div>

        <button
          type="button"
          className="hd-refresh"
          onClick={() => {
            setLocalRefresh((value) => value + 1);
          }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="hd-error" role="alert">
          {error}
        </div>
      )}

      <section className="tl-panel">
        <div className="at-summary">
          <h2>My Assigned Tickets</h2>

          <span>
            {loading
              ? "Loading..."
              : `${tickets.length} tickets`}
          </span>
        </div>

        {loading ? (
          <div className="tl-empty" role="status">
            Loading assigned tickets...
          </div>
        ) : error ? (
          <div className="tl-empty">
            Unable to load assigned tickets.
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="tl-empty">
            No tickets are assigned to you.
          </div>
        ) : (
          <div className="tl-table-wrapper">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sortedTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong className="tl-ticket-title">
                        {ticket.title}
                      </strong>

                      <span className="tl-ticket-id">
                        #{ticket.id}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`tl-priority tl-priority-${String(
                          ticket.priority || "MEDIUM"
                        ).toLowerCase()}`}
                      >
                        {ticket.priority || "MEDIUM"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`tl-status tl-status-${String(
                          ticket.status || "NEW"
                        )
                          .toLowerCase()
                          .replaceAll("_", "-")}`}
                      >
                        {String(ticket.status || "NEW")
                          .replaceAll("_", " ")}
                      </span>
                    </td>

                    <td>{formatDate(ticket.createdAt)}</td>

                    <td>
                      <button
                        type="button"
                        className="tl-view-button"
                        onClick={() =>
                          onOpenTicket(ticket.id)
                        }
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AssignedTickets;
