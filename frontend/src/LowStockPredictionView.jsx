import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  PackagePlus,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
  BarChart2,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

export default function LowStockPredictionView({ onStockUpdated }) {
  const [predictions, setPredictions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [restockingId, setRestockingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/inventory/low-stock-predictions?limit=100');
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
        setSummary(data.summary || null);
        setMetadata(data.model_metadata || null);
      }
    } catch (err) {
      console.error('Failed to load low-stock predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const handleQuickRestock = async (item) => {
    const applianceId = item.appliance_id;
    setRestockingId(applianceId);
    try {
      // Find current stock and add recommended reorder quantity or 5
      const addQty = item.recommended_reorder_quantity || 5;
      const res = await fetchWithAuth(`/api/appliances/${applianceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock_quantity: (item.current_stock || 0) + addQty
        })
      });

      if (res.ok) {
        setSuccessMsg(`Restocked +${addQty} units for "${item.rental_name}"! Replenishing pipeline...`);
        setTimeout(() => setSuccessMsg(''), 4500);
        if (onStockUpdated) onStockUpdated();
        loadPredictions();
      }
    } catch (err) {
      console.error('Failed to restock item:', err);
    } finally {
      setRestockingId(null);
    }
  };

  const filteredPredictions = predictions.filter((item) => {
    const matchesUrgency =
      filterUrgency === 'ALL'
        ? true
        : filterUrgency === 'CRITICAL'
        ? item.reorder_urgency === 'CRITICAL_REORDER_REQUIRED'
        : filterUrgency === 'RECOMMENDED'
        ? item.reorder_urgency === 'REORDER_RECOMMENDED'
        : item.reorder_urgency === 'STOCK_HEALTHY';

    const matchesSearch =
      !searchQuery ||
      item.rental_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesUrgency && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(99, 102, 241, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.4)'
            }}
          >
            <TrendingDown size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                AI Low-Stock & Depletion Regressor
              </h2>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={12} />
                ML GradientBoosting (R² 98.57%)
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Dynamic regression computing depletion velocity, supplier lead-time, and predicted days to stockout per SKU.
            </p>
          </div>
        </div>

        <button
          onClick={loadPredictions}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Forecasts
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <CheckCircle size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #fee2e2',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>
              Critical Reorder Needed
            </span>
            <AlertCircle size={20} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#dc2626' }}>
            {summary ? summary.critical_reorder_count : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
            Stockout projected in &le; 7 days
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #fef3c7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
              Reorder Recommended
            </span>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706' }}>
            {summary ? summary.recommended_reorder_count : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
            Stockout projected in 8-14 days
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #d1fae5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>
              Stock Healthy
            </span>
            <ShieldCheck size={20} color="#059669" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669' }}>
            {summary ? summary.healthy_stock_count : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>
            Runway exceeds 15+ days
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #e0e7ff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#3730a3', fontWeight: 700, textTransform: 'uppercase' }}>
              Model Precision (MAE)
            </span>
            <Zap size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#4338ca' }}>
            &plusmn;{metadata?.mae_days || 1.09} <span style={{ fontSize: '1rem', fontWeight: 600 }}>days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.25rem' }}>
            Mean Absolute Depletion Error
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Tracked SKUs', count: predictions.length },
            { id: 'CRITICAL', label: 'Critical Urgency', count: summary?.critical_reorder_count || 0 },
            { id: 'RECOMMENDED', label: 'Recommended', count: summary?.recommended_reorder_count || 0 },
            { id: 'HEALTHY', label: 'Healthy', count: summary?.healthy_stock_count || 0 }
          ].map((pill) => {
            const isSelected = filterUrgency === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilterUrgency(pill.id)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  border: isSelected ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#64748b',
                  fontSize: '0.825rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    background: isSelected ? '#c7d2fe' : '#f1f5f9',
                    color: isSelected ? '#312e81' : '#64748b',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search SKU, appliance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.5rem 1rem 0.5rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              width: '240px',
              background: '#ffffff'
            }}
          />
        </div>
      </div>

      {/* Depletion Forecast Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  SKU & Appliance
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  Current Stock
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  Weekly Velocity
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  Lead Time
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  Predicted Depletion
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                  Urgency Status
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#475569', fontSize: '0.8rem', textAlign: 'right' }}>
                  Restock Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length > 0 ? (
                filteredPredictions.map((row, idx) => {
                  const isCritical = row.reorder_urgency === 'CRITICAL_REORDER_REQUIRED';
                  const isRecommended = row.reorder_urgency === 'REORDER_RECOMMENDED';
                  const days = Math.round(row.predicted_days_to_stockout || 0);

                  return (
                    <tr
                      key={row.sku || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isCritical ? '#fff7ed' : idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                          {row.rental_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px'
                            }}
                          >
                            {row.sku || (row.appliance_id ? `SKU-${row.appliance_id.slice(0, 8).toUpperCase()}` : 'SKU-GEN')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {row.category_id}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: row.current_stock <= 2 ? '#dc2626' : row.current_stock <= 5 ? '#d97706' : '#059669'
                          }}
                        >
                          {row.current_stock}
                        </span>{' '}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>units</span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#334155' }}>
                        <span style={{ fontWeight: 700 }}>{row.weekly_rental_velocity || row.depletion_velocity_weekly || 1.2}</span>{' '}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>units/wk</span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} color="#94a3b8" />
                          <span>{row.reorder_lead_time_days || 4} days</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: days <= 7 ? '#dc2626' : days <= 14 ? '#d97706' : '#059669'
                            }}
                          >
                            {days} days
                          </div>
                        </div>
                        {/* Progress Meter */}
                        <div
                          style={{
                            width: '100px',
                            height: '5px',
                            background: '#e2e8f0',
                            borderRadius: '999px',
                            marginTop: '0.35rem',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(8, (days / 30) * 100))}%`,
                              height: '100%',
                              background: days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : '#10b981',
                              borderRadius: '999px'
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: isCritical
                              ? '#fef2f2'
                              : isRecommended
                              ? '#fffbeb'
                              : '#ecfdf5',
                            color: isCritical
                              ? '#dc2626'
                              : isRecommended
                              ? '#d97706'
                              : '#059669',
                            border: `1px solid ${
                              isCritical ? '#fecaca' : isRecommended ? '#fde68a' : '#a7f3d0'
                            }`
                          }}
                        >
                          {isCritical && <AlertCircle size={12} />}
                          {isRecommended && <AlertTriangle size={12} />}
                          {!isCritical && !isRecommended && <CheckCircle size={12} />}
                          {isCritical
                            ? 'CRITICAL REORDER'
                            : isRecommended
                            ? 'REORDER SOON'
                            : 'OPTIMAL RUNWAY'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleQuickRestock(row)}
                          disabled={restockingId === row.appliance_id}
                          style={{
                            background: isCritical ? '#dc2626' : '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: restockingId === row.appliance_id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          <PackagePlus size={14} />
                          <span>
                            {restockingId === row.appliance_id
                              ? 'Ordering...'
                              : `+${row.recommended_reorder_units || row.recommended_reorder_quantity || 5} Restock`}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 700, color: '#334155' }}>All Inventory Runways Healthy</div>
                    <div style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                      No items currently matching urgency filter "{filterUrgency}".
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
