
import { useEffect, useMemo, useState } from "react";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/api";

import "./Categories.css";

// ========================================
// CATEGORY MANAGEMENT PAGE
// ADMIN ONLY
// ========================================

function Categories({ token, tickets = [], onChanged }) {
  // Category list
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Search
  const [search, setSearch] = useState("");

  // Create / Edit form
  const [formMode, setFormMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [notice, setNotice] = useState("");

  // ========================================
  // LOAD CATEGORIES
  // ========================================

  useEffect(() => {
    let active = true;

    getCategories(token)
      .then((data) => {
        if (active) {
          setCategories(data);
          setLoadError("");
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err.message || "Failed to load categories"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  function refreshCategories() {
    setLoading(true);
    setLoadError("");
    setRefreshKey((value) => value + 1);
  }

  // ========================================
  // SEARCH CATEGORIES
  // ========================================

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return categories
      .filter((category) => {
        const searchable = [
          category.id,
          category.name,
        ]
          .join(" ")
          .toLowerCase();

        return !keyword || searchable.includes(keyword);
      })
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
  }, [categories, search]);

  // ========================================
  // COUNT TICKETS IN EACH CATEGORY
  // ========================================

  function countCategoryTickets(categoryId) {
    return tickets.filter((ticket) => {
      const ticketCategoryId =
        ticket.categoryId ??
        ticket.category?.id ??
        null;

      return (
        ticketCategoryId !== null &&
        Number(ticketCategoryId) === Number(categoryId)
      );
    }).length;
  }

  // ========================================
  // OPEN CREATE FORM
  // ========================================

  function startCreate() {
    setFormMode("create");
    setEditingId(null);
    setCategoryName("");
    setFormError("");
    setNotice("");
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  function startEdit(category) {
    setFormMode("edit");
    setEditingId(category.id);
    setCategoryName(category.name);
    setFormError("");
    setNotice("");
  }

  // ========================================
  // CANCEL FORM
  // ========================================

  function cancelForm() {
    if (saving) return;

    setFormMode(null);
    setEditingId(null);
    setCategoryName("");
    setFormError("");
  }

  // ========================================
  // CREATE / UPDATE CATEGORY
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setFormError("");
    setNotice("");

    const name = categoryName.trim();

    if (!name) {
      setFormError("Category name is required");
      return;
    }

    if (name.length > 100) {
      setFormError(
        "Category name must not exceed 100 characters"
      );
      return;
    }

    if (formMode !== "create" && formMode !== "edit") {
      return;
    }

    setSaving(true);

    try {
      if (formMode === "create") {
        await createCategory(token, name);

        setNotice("Category created successfully!");
      } else {
        await updateCategory(token, editingId, name);

        setNotice("Category updated successfully!");
      }

      // Reset form
      setFormMode(null);
      setEditingId(null);
      setCategoryName("");
      setFormError("");

      // Reload categories from backend
      refreshCategories();

      // Reload ticket data in Dashboard
      onChanged?.();
    } catch (err) {
      setFormError(
        err.message || "Failed to save category"
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // OPEN DELETE DIALOG
  // ========================================

  function openDeleteDialog(category) {
    setDeleteTarget(category);
    setDeleteConfirm("");
    setDeleteError("");
    setNotice("");
  }

  function closeDeleteDialog() {
    if (deleting) return;

    setDeleteTarget(null);
    setDeleteConfirm("");
    setDeleteError("");
  }

  // Close dialog using Escape
  useEffect(() => {
    if (!deleteTarget) return;

    function handleEscape(event) {
      if (event.key === "Escape" && !deleting) {
        setDeleteTarget(null);
        setDeleteConfirm("");
        setDeleteError("");
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [deleteTarget, deleting]);

  // ========================================
  // DELETE CATEGORY
  // ========================================

  async function handleDelete(event) {
    event.preventDefault();

    if (
      !deleteTarget ||
      deleting ||
      deleteConfirm.trim() !== "DELETE"
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteCategory(token, deleteTarget.id);

      setDeleteTarget(null);
      setDeleteConfirm("");
      setNotice("Category deleted successfully!");

      refreshCategories();
      onChanged?.();
    } catch (err) {
      setDeleteError(
        err.message || "Failed to delete category"
      );
    } finally {
      setDeleting(false);
    }
  }

  // ========================================
  // RENDER PAGE
  // ========================================

  return (
    <div className="cat-page">
      {/* PAGE HEADING */}
      <div className="hd-page-heading">
        <div>
          <div className="hd-eyebrow">
            ADMIN WORKSPACE
          </div>

          <h1>Categories</h1>

          <p>
            Create, edit and manage ticket categories.
          </p>
        </div>

        <div className="cat-heading-actions">
          <button
            type="button"
            className="cat-secondary-btn"
            onClick={refreshCategories}
            disabled={loading || saving || deleting}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          {formMode === null && (
            <button
              type="button"
              className="hd-refresh"
              onClick={startCreate}
              disabled={saving || deleting}
            >
              + Create Category
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {notice && (
        <div className="cat-success" role="status">
          {notice}
        </div>
      )}

      {/* FETCH ERROR */}
      {loadError && (
        <div className="cat-error" role="alert">
          <span>{loadError}</span>

          <button
            type="button"
            onClick={refreshCategories}
          >
            Try again
          </button>
        </div>
      )}

      {/* =====================================
          CREATE / EDIT FORM
      ===================================== */}

      {formMode && (
        <section className="cat-card cat-form-card">
          <div className="cat-section-heading">
            <h2>
              {formMode === "create"
                ? "Create New Category"
                : "Edit Category"}
            </h2>

            <p>
              {formMode === "create"
                ? "Add a new category for support tickets."
                : `Update category #${editingId}.`}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="cat-form-field">
              <label htmlFor="category-name">
                Category Name *
              </label>

              <input
                id="category-name"
                type="text"
                value={categoryName}
                onChange={(event) => {
                  setCategoryName(event.target.value);
                  setFormError("");
                }}
                placeholder="Enter category name"
                maxLength={100}
                required
                disabled={saving}
                autoFocus
              />

              <small>
                {categoryName.length}/100 characters
              </small>
            </div>

            {formError && (
              <div className="cat-error" role="alert">
                {formError}
              </div>
            )}

            <div className="cat-form-actions">
              <button
                type="button"
                className="cat-secondary-btn"
                onClick={cancelForm}
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
                  : formMode === "create"
                    ? "Create Category"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* =====================================
          CATEGORY LIST
      ===================================== */}

      <section className="cat-card">
        <div className="cat-list-header">
          <div className="cat-section-heading">
            <h2>Category List</h2>

            <p>
              Manage categories stored in PostgreSQL.
            </p>
          </div>

          <span className="cat-count-badge">
            {categories.length} Categories
          </span>
        </div>

        <div className="cat-search-group">
          <label htmlFor="category-search">
            Search Categories
          </label>

          <input
            id="category-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by category name or ID"
          />
        </div>

        {loading ? (
          <div className="cat-empty" role="status">
            Loading categories...
          </div>
        ) : loadError ? (
          <div className="cat-empty">
            Unable to load categories.
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="cat-empty">
            No categories found.
          </div>
        ) : (
          <div className="cat-table-wrapper">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th>Tickets Using</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => {
                  const ticketCount =
                    countCategoryTickets(category.id);

                  return (
                    <tr key={category.id}>
                      <td>
                        <span className="cat-id">
                          #{category.id}
                        </span>
                      </td>

                      <td>
                        <strong className="cat-name">
                          {category.name}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`cat-usage ${
                            ticketCount > 0
                              ? "cat-usage-active"
                              : ""
                          }`}
                        >
                          {ticketCount} Tickets
                        </span>
                      </td>

                      <td>
                        <div className="cat-row-actions">
                          <button
                            type="button"
                            className="cat-edit-btn"
                            onClick={() =>
                              startEdit(category)
                            }
                            disabled={saving || deleting}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="cat-delete-btn"
                            onClick={() =>
                              openDeleteDialog(category)
                            }
                            disabled={saving || deleting}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="cat-footnote">
          Ticket counts are calculated from the loaded
          ticket list. The backend makes the final
          decision about whether a category can be deleted.
        </p>
      </section>

      {/* =====================================
          DELETE CONFIRMATION DIALOG
      ===================================== */}

      {deleteTarget && (
        <div className="cat-modal-backdrop">
          <section
            className="cat-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cat-delete-title"
            aria-describedby="cat-delete-description"
          >
            <div className="cat-warning-icon">!</div>

            <h2 id="cat-delete-title">
              Delete Category?
            </h2>

            <p id="cat-delete-description">
              You are about to delete this category:
            </p>

            <div className="cat-delete-info">
              <strong>{deleteTarget.name}</strong>

              <span>
                Category ID: {deleteTarget.id}
              </span>

              <span>
                Tickets using:{" "}
                {countCategoryTickets(deleteTarget.id)}
              </span>
            </div>

            <p className="cat-warning-text">
              Categories referenced by existing tickets
              cannot be deleted.
            </p>

            <form onSubmit={handleDelete}>
              <label
                htmlFor="category-delete-confirm"
                className="cat-delete-label"
              >
                Type <strong>DELETE</strong> to confirm
              </label>

              <input
                id="category-delete-confirm"
                className="cat-delete-input"
                type="text"
                value={deleteConfirm}
                onChange={(event) =>
                  setDeleteConfirm(event.target.value)
                }
                placeholder="DELETE"
                autoComplete="off"
                disabled={deleting}
                autoFocus
              />

              {deleteError && (
                <div className="cat-error" role="alert">
                  {deleteError}
                </div>
              )}

              <div className="cat-modal-actions">
                <button
                  type="button"
                  className="cat-secondary-btn"
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cat-confirm-delete-btn"
                  disabled={
                    deleting ||
                    deleteConfirm.trim() !== "DELETE"
                  }
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Category"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Categories;
