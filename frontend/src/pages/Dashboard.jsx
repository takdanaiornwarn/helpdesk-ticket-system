
import { useEffect, useState } from "react";

import { getTickets } from "../services/api";

import Tickets from "./Tickets";
import TicketDetails from "./TicketDetails";
import AssignedTickets from "./AssignedTickets";
import Categories from "./Categories";

import "./Dashboard.css";

// ========================================
// HELPDESK DASHBOARD
// STEP 13.6.3
// ========================================

function Dashboard({ user, token, onLogout }) {
  const isAdmin = user.role === "ADMIN";

  // Navigation
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [detailsBackPage, setDetailsBackPage] = useState("tickets");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tickets
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // SIDEBAR MENU
  // ========================================

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "▦",
    },
    {
      id: "tickets",
      label: isAdmin ? "All Tickets" : "My Tickets",
      icon: "☷",
    },
    ...(isAdmin
      ? [
          {
            id: "assigned",
            label: "Assigned to Me",
            icon: "◈",
          },
          {
            id: "categories",
            label: "Categories",
            icon: "▤",
          },
        ]
      : []),
    {
      id: "profile",
      label: "My Profile",
      icon: "◉",
    },
  ];

  const pageLabels = {
    dashboard: "Dashboard",
    tickets: isAdmin ? "All Tickets" : "My Tickets",
    details: "Ticket Details",
    assigned: "Assigned to Me",
    categories: "Categories",
    profile: "My Profile",
  };

  // ========================================
  // GET TICKETS FROM BACKEND
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadTickets() {
      setLoading(true);
      setError("");

      try {
        const data = await getTickets(token);

        if (active) {
          setTickets(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load tickets"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  // ========================================
  // NAVIGATION
  // ========================================

  function navigateTo(page) {
    setActivePage(page);
    setSelectedTicketId(null);
    setMobileMenuOpen(false);
  }

  function openTicket(ticketId, sourcePage = "tickets") {
    setSelectedTicketId(ticketId);
    setDetailsBackPage(sourcePage);
    setActivePage("details");
    setMobileMenuOpen(false);
  }

  function refreshTickets() {
    setRefreshKey((value) => value + 1);
  }

  function handleTicketDeleted() {
    refreshTickets();
    navigateTo(detailsBackPage);
  }

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  const countByStatus = (status) =>
    tickets.filter(
      (ticket) => ticket.status === status
    ).length;

  const stats = [
    {
      label: isAdmin ? "All Tickets" : "My Tickets",
      value: tickets.length,
      type: "total",
    },
    {
      label: "New",
      value: countByStatus("NEW"),
      type: "new",
    },
    {
      label: "In Progress",
      value: countByStatus("IN_PROGRESS"),
      type: "progress",
    },
    {
      label: "Resolved",
      value: countByStatus("RESOLVED"),
      type: "resolved",
    },
    {
      label: "Closed",
      value: countByStatus("CLOSED"),
      type: "closed",
    },
  ];

  const recentTickets = [...tickets]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 5);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="hd-shell">
      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <button
          className="hd-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside
        className={`hd-sidebar ${
          mobileMenuOpen ? "hd-sidebar-open" : ""
        }`}
      >
        <div className="hd-brand">
          <div className="hd-brand-icon">H</div>

          <div>
            <strong>Helpdesk</strong>
            <span>Ticket Management</span>
          </div>
        </div>

        <div className="hd-menu-label">
          WORKSPACE
        </div>

        <nav
          className="hd-navigation"
          aria-label="Main navigation"
        >
          {menuItems.map((item) => {
            const selected =
              activePage === item.id ||
              (activePage === "details" &&
                item.id === detailsBackPage);

            return (
              <button
                key={item.id}
                type="button"
                className={`hd-nav-item ${
                  selected ? "active" : ""
                }`}
                aria-current={
                  selected ? "page" : undefined
                }
                onClick={() => navigateTo(item.id)}
              >
                <span
                  className="hd-nav-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hd-sidebar-bottom">
          <div className="hd-sidebar-user">
            <div className="hd-avatar">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="hd-user-info">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>

          <button
            type="button"
            className="hd-logout"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* =====================================
          MAIN AREA
      ===================================== */}

      <div className="hd-main-area">
        <header className="hd-topbar">
          <div className="hd-topbar-left">
            <button
              type="button"
              className="hd-mobile-menu"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen((value) => !value)
              }
            >
              ☰
            </button>

            <span>{pageLabels[activePage]}</span>
          </div>

          <div className="hd-topbar-right">
            <span
              className={`hd-role ${
                isAdmin ? "hd-role-admin" : ""
              }`}
            >
              {user.role}
            </span>

            <div className="hd-topbar-avatar">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <main className="hd-content">
          {/* =================================
              DASHBOARD OVERVIEW
          ================================= */}

          {activePage === "dashboard" && (
            <>
              <div className="hd-page-heading">
                <div>
                  <div className="hd-eyebrow">
                    OVERVIEW
                  </div>

                  <h1>Welcome back, {user.name}</h1>

                  <p>
                    {isAdmin
                      ? "Monitor all support tickets across the system."
                      : "Track your support requests and their progress."}
                  </p>
                </div>

                <button
                  type="button"
                  className="hd-refresh"
                  disabled={loading}
                  onClick={refreshTickets}
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {error && (
                <div className="hd-error" role="alert">
                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={refreshTickets}
                  >
                    Try again
                  </button>
                </div>
              )}

              {loading ? (
                <div className="hd-panel" role="status">
                  Loading dashboard...
                </div>
              ) : !error ? (
                <>
                  <section
                    className="hd-stats"
                    aria-label="Ticket statistics"
                  >
                    {stats.map((stat) => (
                      <div
                        key={stat.type}
                        className="hd-stat-card"
                      >
                        <span>{stat.label}</span>

                        <strong>{stat.value}</strong>

                        <div
                          className={`hd-stat-line hd-stat-${stat.type}`}
                        />
                      </div>
                    ))}
                  </section>

                  <section className="hd-panel">
                    <div className="hd-panel-heading">
                      <div>
                        <h2>
                          {isAdmin
                            ? "Recent Tickets"
                            : "My Recent Tickets"}
                        </h2>

                        <p>Latest support requests</p>
                      </div>

                      <button
                        type="button"
                        className="hd-text-button"
                        onClick={() =>
                          navigateTo("tickets")
                        }
                      >
                        View all
                      </button>
                    </div>

                    {recentTickets.length === 0 ? (
                      <div className="hd-empty">
                        No tickets found.
                      </div>
                    ) : (
                      <div className="hd-ticket-list">
                        {recentTickets.map((ticket) => (
                          <div
                            className="hd-ticket-row"
                            key={ticket.id}
                          >
                            <div className="hd-ticket-info">
                              <strong>{ticket.title}</strong>

                              <span>
                                Ticket #{ticket.id}
                              </span>
                            </div>

                            <span
                              className={`hd-status hd-status-${String(
                                ticket.status
                              )
                                .toLowerCase()
                                .replaceAll("_", "-")}`}
                            >
                              {String(ticket.status).replaceAll(
                                "_",
                                " "
                              )}
                            </span>

                            <button
                              type="button"
                              className="hd-text-button"
                              onClick={() =>
                                openTicket(
                                  ticket.id,
                                  "dashboard"
                                )
                              }
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </>
          )}

          {/* =================================
              ALL TICKETS / MY TICKETS
          ================================= */}

          {activePage === "tickets" && (
            <Tickets
              token={token}
              tickets={tickets}
              loading={loading}
              error={error}
              isAdmin={isAdmin}
              onRefresh={refreshTickets}
              onOpenTicket={(ticketId) =>
                openTicket(ticketId, "tickets")
              }
            />
          )}

          {/* =================================
              ASSIGNED TO ME
          ================================= */}

          {activePage === "assigned" && isAdmin && (
            <AssignedTickets
              token={token}
              refreshVersion={refreshKey}
              onOpenTicket={(ticketId) =>
                openTicket(ticketId, "assigned")
              }
            />
          )}

          {/* =================================
              TICKET DETAILS
          ================================= */}

          {activePage === "details" &&
            selectedTicketId !== null && (
              <TicketDetails
                ticketId={selectedTicketId}
                token={token}
                user={user}
                onBack={() =>
                  navigateTo(detailsBackPage)
                }
                onUpdated={refreshTickets}
                onDeleted={handleTicketDeleted}
              />
            )}

          {/* =================================
              CATEGORIES MANAGEMENT
              ADMIN ONLY
          ================================= */}

          {activePage === "categories" && isAdmin && (
            <Categories
              token={token}
              tickets={tickets}
              onChanged={refreshTickets}
            />
          )}

          {/* =================================
              MY PROFILE
          ================================= */}

          {activePage === "profile" && (
            <>
              <div className="hd-page-heading">
                <div>
                  <div className="hd-eyebrow">
                    ACCOUNT
                  </div>

                  <h1>My Profile</h1>

                  <p>Your account information</p>
                </div>
              </div>

              <section className="hd-panel hd-profile">
                <div className="hd-profile-row">
                  <span>Name</span>

                  <strong>{user.name}</strong>
                </div>

                <div className="hd-profile-row">
                  <span>Email</span>

                  <strong>{user.email}</strong>
                </div>

                <div className="hd-profile-row">
                  <span>Role</span>

                  <strong>{user.role}</strong>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
