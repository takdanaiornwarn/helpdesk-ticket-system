
import { useMemo, useState, useEffect } from "react";

import {
  getCategories,
  createTicket,
} from "../services/api";

import "./Tickets.css";
import "./TicketUX.css";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  "ALL",
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const PRIORITY_OPTIONS = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
];

function formatStatus(status) {
  return String(status || "UNKNOWN").replaceAll("_", " ");
}

function formatDate(date) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Prevent spreadsheet formula interpretation
// and properly escape CSV values.
function csvCell(value) {
  let text = String(value ?? "");

  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadTicketsCsv(tickets) {
  const headers = [
    "Ticket ID",
    "Title",
    "Category",
    "Priority",
    "Status",
    "Created At",
  ];

  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.title,
    ticket.category?.name || "",
    ticket.priority,
    ticket.status,
    ticket.createdAt || "",
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "helpdesk-tickets.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ========================================
// CREATE TICKET FORM
// ========================================

function CreateTicketForm({ token, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [categoryName, setCategoryName] = useState("");

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const result = await getCategories(token);

        if (active) {
          setCategories(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load categories"
          );
        }
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription || !categoryName) {
      setError("Please complete all required fields");
      return;
    }

    if (cleanTitle.length > 150) {
      setError("Title must not exceed 150 characters");
      return;
    }

    if (cleanDescription.length > 2000) {
      setError(
        "Description must not exceed 2000 characters"
      );
      return;
    }

    setSaving(true);

    try {
      await createTicket(token, {
        title: cleanTitle,
        description: cleanDescription,
        priority,
        categoryName,
      });

      onCreated();
    } catch (err) {
      setError(
        err.message || "Failed to create ticket"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="tl-panel tl-create-form">
      <div className="tl-form-heading">
        <div>
          <h2>Create New Ticket</h2>
          <p>Provide the details of your support request.</p>
        </div>

        <button
          type="button"
          className="tl-clear"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="tl-form-group">
          <label htmlFor="new-ticket-title">
            Title <span className="tl-required">*</span>
          </label>

          <input
            id="new-ticket-title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            maxLength={150}
            placeholder="Briefly describe your issue"
            required
            disabled={saving}
          />

          <small>{title.length}/150 characters</small>
        </div>

        <div className="tl-form-group">
          <label htmlFor="new-ticket-description">
            Description <span className="tl-required">*</span>
          </label>

          <textarea
            id="new-ticket-description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            maxLength={2000}
            rows={5}
            placeholder="Explain the problem in detail..."
            required
            disabled={saving}
          />

          <small>
            {description.length}/2000 characters
          </small>
        </div>

        <div className="tl-form-grid">
          <div className="tl-form-group">
            <label htmlFor="new-ticket-category">
              Category <span className="tl-required">*</span>
            </label>

            <select
              id="new-ticket-category"
              value={categoryName}
              onChange={(event) =>
                setCategoryName(event.target.value)
              }
              required
              disabled={saving || loadingCategories}
            >
              <option value="">
                {loadingCategories
                  ? "Loading categories..."
                  : "Select category"}
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.name}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="tl-form-group">
            <label htmlFor="new-ticket-priority">
              Priority
            </label>

            <select
              id="new-ticket-priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value)
              }
              disabled={saving}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        {!loadingCategories && categories.length === 0 && (
          <div className="tl-form-warning">
            No categories available.
            Please contact an administrator.
          </div>
        )}

        {error && (
          <div className="tl-form-error" role="alert">
            {error}
          </div>
        )}

        <div className="tl-form-actions">
          <button
            type="button"
            className="tl-cancel-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="hd-refresh"
            disabled={
              saving ||
              loadingCategories ||
              categories.length === 0
            }
          >
            {saving ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ========================================
// TICKET LIST
// ========================================

function Tickets({
  token,
  tickets,
  loading,
  error,
  isAdmin,
  onRefresh,
  onOpenTicket,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [priorityFilter, setPriorityFilter] =
    useState("ALL");

  const [sortOrder, setSortOrder] =
    useState("newest");

  const [page, setPage] = useState(1);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  // ========================================
  // FILTER AND SORT
  // ========================================

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const matching = tickets.filter((ticket) => {
      const searchableText = [
        ticket.id,
        ticket.title,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        ticket.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });

    return matching.sort((a, b) => {
      const dateA = new Date(
        a.createdAt || 0
      ).getTime();

      const dateB = new Date(
        b.createdAt || 0
      ).getTime();

      return sortOrder === "oldest"
        ? dateA - dateB
        : dateB - dateA;
    });
  }, [
    tickets,
    search,
    statusFilter,
    priorityFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const startIndex =
    (currentPage - 1) * PAGE_SIZE;

  const visibleTickets = filteredTickets.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  // ========================================
  // FILTER HANDLERS
  // ========================================

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePriorityFilter(value) {
    setPriorityFilter(value);
    setPage(1);
  }

  function handleSortOrder(value) {
    setSortOrder(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSortOrder("newest");
    setPage(1);
  }

  function handleCreated() {
    setShowCreateForm(false);
    setSuccessMessage(
      "Ticket created successfully!"
    );

    clearFilters();
    onRefresh();
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="ticket-list-page">
      <div className="hd-page-heading">
        <div>
          <div className="hd-eyebrow">
            TICKET MANAGEMENT
          </div>

          <h1>
            {isAdmin
              ? "All Tickets"
              : "My Tickets"}
          </h1>

          <p>
            {isAdmin
              ? "View and manage tickets across the system."
              : "Create and track your support requests."}
          </p>
        </div>

        <div className="tl-heading-actions">
          <button
            type="button"
            className="tl-secondary-button"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          {!showCreateForm && (
            <button
              type="button"
              className="hd-refresh"
              onClick={() => {
                setSuccessMessage("");
                setShowCreateForm(true);
              }}
            >
              + Create Ticket
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div
          className="tl-success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div className="hd-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={onRefresh}
          >
            Try again
          </button>
        </div>
      )}

      {showCreateForm ? (
        <CreateTicketForm
          token={token}
          onCreated={handleCreated}
          onCancel={() =>
            setShowCreateForm(false)
          }
        />
      ) : (
        <section className="tl-panel">
          {/* SEARCH AND FILTER */}
          <div className="tl-toolbar tl-ux-toolbar">
            <div className="tl-search">
              <label htmlFor="ticket-search">
                Search tickets
              </label>

              <input
                id="ticket-search"
                type="search"
                value={search}
                onChange={(event) =>
                  handleSearch(event.target.value)
                }
                placeholder="Search title or ticket ID"
              />
            </div>

            <div className="tl-filter">
              <label htmlFor="ticket-status">
                Status
              </label>

              <select
                id="ticket-status"
                value={statusFilter}
                onChange={(event) =>
                  handleStatusFilter(event.target.value)
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "ALL"
                      ? "All Statuses"
                      : formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tl-filter">
              <label htmlFor="ticket-priority">
                Priority
              </label>

              <select
                id="ticket-priority"
                value={priorityFilter}
                onChange={(event) =>
                  handlePriorityFilter(
                    event.target.value
                  )
                }
              >
                {PRIORITY_OPTIONS.map(
                  (priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {priority === "ALL"
                        ? "All Priorities"
                        : priority}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="tl-filter">
              <label htmlFor="ticket-sort">
                Sort
              </label>

              <select
                id="ticket-sort"
                value={sortOrder}
                onChange={(event) =>
                  handleSortOrder(
                    event.target.value
                  )
                }
              >
                <option value="newest">
                  Newest first
                </option>

                <option value="oldest">
                  Oldest first
                </option>
              </select>
            </div>
          </div>

          {/* LIST SUMMARY */}
          <div className="tl-summary tl-ux-summary">
            <span role="status" aria-live="polite">
              {loading
                ? "Loading tickets..."
                : `Showing ${filteredTickets.length} of ${tickets.length} tickets`}
            </span>

            <div className="tl-ux-actions">
              <button
                type="button"
                className="tl-export-button"
                onClick={() =>
                  downloadTicketsCsv(
                    filteredTickets
                  )
                }
                disabled={
                  loading ||
                  Boolean(error) ||
                  filteredTickets.length === 0
                }
              >
                Export CSV
              </button>

              <button
                type="button"
                className="tl-clear"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div
              className="tl-empty"
              role="status"
            >
              Loading tickets...
            </div>
          ) : error ? (
            <div className="tl-empty">
              Unable to load tickets.
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="tl-empty">
              No tickets match your search or filters.
            </div>
          ) : (
            <>
              <div className="tl-table-wrapper">
                <table className="tl-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleTickets.map((ticket) => (
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
                          {ticket.category?.name ||
                            "-"}
                        </td>

                        <td>
                          <span
                            className={`tl-priority tl-priority-${String(
                              ticket.priority ||
                                "MEDIUM"
                            ).toLowerCase()}`}
                          >
                            {ticket.priority ||
                              "MEDIUM"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`tl-status tl-status-${String(
                              ticket.status || ""
                            )
                              .toLowerCase()
                              .replaceAll("_", "-")}`}
                          >
                            {formatStatus(
                              ticket.status
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            ticket.createdAt
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="tl-view-button"
                            onClick={() =>
                              onOpenTicket(
                                ticket.id
                              )
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

              {/* PAGINATION */}
              <div className="tl-pagination">
                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <div className="tl-pagination-actions">
                  <button
                    type="button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setPage((value) =>
                        Math.max(1, value - 1)
                      )
                    }
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      currentPage === totalPages
                    }
                    onClick={() =>
                      setPage((value) =>
                        Math.min(
                          totalPages,
                          value + 1
                        )
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default Tickets;
