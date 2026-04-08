"use client";

import { useState, useEffect, useMemo } from "react";
import "./globals.css";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedWabas, setSelectedWabas] = useState(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load templates");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleWaba = (id) => {
    setSelectedWabas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatus = (status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();

    return data.wabas
      .filter((w) => selectedWabas.size === 0 || selectedWabas.has(w.waba_id))
      .map((w) => {
        const templates = w.templates.filter((t) => {
          if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false;
          if (!q) return true;
          const bodyComp = t.components?.find((c) => c.type === "BODY");
          const bodyText = bodyComp?.text || "";
          return (
            t.name.toLowerCase().includes(q) ||
            bodyText.toLowerCase().includes(q) ||
            t.language?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q)
          );
        });
        return { ...w, templates };
      })
      .filter((w) => w.templates.length > 0);
  }, [data, search, selectedWabas, selectedStatuses]);

  const totalTemplates = filtered.reduce((sum, w) => sum + w.templates.length, 0);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
          Cargando templates de todas las WABAs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-inner">
          <div className="logo">W</div>
          <div>
            <h1>WhatsApp Template Hub</h1>
            <p className="header-subtitle">
              Visualiza y gestiona los templates de WhatsApp Business
            </p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filters">
          <input
            className="search-input"
            type="text"
            placeholder="Buscar por nombre, texto, idioma o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="status-filters">
            {["APPROVED", "PENDING", "REJECTED"].map((s) => (
              <button
                key={s}
                className={`status-chip ${selectedStatuses.has(s) ? "active" : ""} ${s.toLowerCase()}`}
                onClick={() => toggleStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-chips">
          {data.wabas.map((w) => (
            <button
              key={w.waba_id}
              className={`chip ${selectedWabas.has(w.waba_id) ? "active" : ""}`}
              onClick={() => toggleWaba(w.waba_id)}
            >
              {w.waba_name} ({w.templates.length})
            </button>
          ))}
        </div>
      </div>

      <p className="summary">
        Mostrando <strong>{totalTemplates}</strong> templates en{" "}
        <strong>{filtered.length}</strong> WABAs
      </p>

      {filtered.map((waba) => (
        <div key={waba.waba_id} className="waba-section">
          <div className="waba-header">
            <h2>{waba.waba_name}</h2>
            <span className="count">{waba.templates.length}</span>
          </div>
          <div className="templates-grid">
            {waba.templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template }) {
  const header = template.components?.find((c) => c.type === "HEADER");
  const body = template.components?.find((c) => c.type === "BODY");
  const footer = template.components?.find((c) => c.type === "FOOTER");
  const buttons = template.components?.find((c) => c.type === "BUTTONS");
  const statusClass = `status-${template.status?.toLowerCase()}`;

  return (
    <div className="template-card">
      <div className="card-header">
        <div className="name">{template.name}</div>
        <div className="meta">
          <span className={`tag ${statusClass}`}>{template.status}</span>
          <span className="tag category">{template.category}</span>
          <span className="tag">{template.language}</span>
        </div>
      </div>

      <div className="wa-preview">
        <div className="wa-bubble">
          {header?.text && <div className="wa-header-text">{header.text}</div>}
          {body?.text && <div className="wa-body-text">{body.text}</div>}
          {footer?.text && <div className="wa-footer-text">{footer.text}</div>}
          <div className="wa-timestamp">12:00</div>
        </div>

        {buttons?.buttons?.length > 0 && (
          <div className="wa-buttons">
            {buttons.buttons.map((btn, i) => (
              <div key={i} className="wa-btn">
                <span className="wa-btn-icon">
                  {btn.type === "URL"
                    ? "\uD83D\uDD17"
                    : btn.type === "PHONE_NUMBER"
                      ? "\uD83D\uDCDE"
                      : "\u21A9\uFE0F"}
                </span>
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
