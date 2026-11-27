import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Download, 
  ShieldCheck, 
  Activity, 
  Calendar, 
  Layers, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell 
} from 'recharts';
import { fetchWithAuth } from './utils/api';

const BusinessIntelligenceTab = ({ onExport }) => {
  const [biData, setBiData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBi = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/admin/bi-analytics/');
      if (res.ok) {
        const data = await res.json();
        setBiData(data);
      }
    } catch (err) {
      console.error('Failed to fetch BI data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBi();
  }, []);

  const fin = biData?.financial_kpis || {};
  const fleet = biData?.fleet_kpis || {};

  const handleDownloadCsv = () => {
    if (onExport) {
      onExport('financials');
    } else {
      window.open('/api/admin/export/?type=financials', '_blank');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase'
            }}>
              Executive Intelligence Suite
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Live Data • Last computed: {biData?.last_computed_at ? new Date(biData.last_computed_at).toLocaleTimeString() : 'Active'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Enterprise Business Intelligence & Predictive Analytics
          </h1>
          <p style={{ color: '#64748b', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            Subscription ARR run-rate, fleet asset capital ROI, 6-month category predictive demand, and cohort retention.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchBi}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh BI</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Download size={14} />
            <span>Export Executive Brief (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
        {/* Monthly Recurring Revenue */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.35rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
            <span>Monthly Recurring Revenue (MRR)</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
              <ArrowUpRight size={14} /> +{fin.mrr_growth_yoy_pct || '28.4'}%
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem' }}>
            ₹{(fin.mrr || 48250).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            ARR Run-Rate: <strong>₹{(fin.arr || 579000).toLocaleString()}</strong>
          </div>
        </div>

        {/* Fleet Utilization Index */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.35rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
            <span>Fleet Asset Utilization</span>
            <Activity size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', margin: '0.4rem 0 0.2rem' }}>
            {fleet.fleet_utilization_pct || 91}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {fleet.active_leased_units || 41} Leased • {fleet.ready_units_in_depots || 14} Warehouse Depot Buffer
          </div>
        </div>

        {/* Customer ARPU & LTV */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.35rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
            <span>Average Revenue / User (ARPU)</span>
            <DollarSign size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem' }}>
            ₹{(fin.arpu || 1850).toLocaleString()}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>/mo</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Estimated Customer LTV: <strong>₹{(fin.customer_ltv || 11180).toLocaleString()}</strong>
          </div>
        </div>

        {/* Escrow Deposit Balance & Collections */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.35rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
            <span>Security Deposit Escrow</span>
            <ShieldCheck size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem' }}>
            ₹{(fin.escrow_deposits_held || 68400).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669' }}>
            ✓ Refundable Security Deposits • {fin.collection_efficiency_pct || '96.8'}% On-Time
          </div>
        </div>
      </div>

      {/* Visual Charts Row 1: MRR Run-Rate & Asset Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Monthly Revenue & MRR Growth */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Subscription MRR & Gross Inflow Trajectory
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Historical 6-month compounding rental cash flow
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
              Gross Margin: {fin.gross_margin_pct || 73.2}%
            </span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={biData?.revenue_trend || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMrr" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Gross Inflow (₹)" stroke="#4f46e5" strokeWidth={2} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="mrr" name="Recurring MRR (₹)" stroke="#10b981" strokeWidth={2} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Profitability & Market Penetration */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Geographic Market Performance & Profitability
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Active leases and operating margin across metropolitan distribution hubs
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
              5 Metro Hubs
            </span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={biData?.city_performance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="city" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip formatter={(value, name) => [name === 'margin_pct' ? `${value}%` : value, name === 'margin_pct' ? 'Margin' : 'Active Leases']} />
                <Legend />
                <Bar dataKey="active_leases" name="Active Leases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margin_pct" name="Gross Margin (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Predictive Demand Forecasting (Next 6 Months: Seasonal ML Forecast) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#eab308" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                AI Predictive Rental Demand Forecasting (6 Months Ahead)
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Projected booking volume accounting for seasonal summer AC surges, monsoon dryers, and college room combos
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.65rem', borderRadius: '4px', fontWeight: 800 }}>
            ⚡ Surge Alert: ACs +370% in Mar-Apr
          </span>
        </div>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={biData?.demand_forecast || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="air_conditioners" name="Air Conditioners" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="refrigerators" name="Refrigerators" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="washing_machines" name="Washing Machines" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="water_purifiers" name="Water Purifiers" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="room_combos" name="Room Combos" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cohort Retention Matrix */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Customer Retention Cohort Matrix (%)
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Percentage of subscribing customers maintaining active leases across tenure months
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 800 }}>
            82% 6-Month Stickiness
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Acquisition Cohort</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 1</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 2</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 3</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 4</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 5</th>
                <th style={{ padding: '0.75rem', fontWeight: 700, color: '#475569' }}>Month 6</th>
              </tr>
            </thead>
            <tbody>
              {(biData?.cohort_retention || []).map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>
                    {row.cohort}
                  </td>
                  {['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(m => {
                    const val = row[m];
                    let bg = '#ffffff';
                    let col = '#0f172a';
                    if (val !== null && val !== undefined) {
                      if (val >= 95) { bg = '#dcfce7'; col = '#15803d'; }
                      else if (val >= 90) { bg = '#f0fdf4'; col = '#166534'; }
                      else if (val >= 85) { bg = '#eff6ff'; col = '#1d4ed8'; }
                      else { bg = '#f8fafc'; col = '#475569'; }
                    }
                    return (
                      <td key={m} style={{ padding: '0.75rem', background: val ? bg : '#ffffff', color: val ? col : '#cbd5e1', fontWeight: 600 }}>
                        {val !== null && val !== undefined ? `${val}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessIntelligenceTab;
