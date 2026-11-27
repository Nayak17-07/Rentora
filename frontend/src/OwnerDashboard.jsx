import { showToast } from './utils/toast';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, PlusCircle, DollarSign, Package, Users, TrendingUp, 
  ArrowLeft, CheckCircle2, Clock, Trash2, Edit3, ShieldCheck, 
  Sparkles, ExternalLink, RefreshCw, X, ChevronRight, AlertCircle,
  Download, CreditCard, Send, Check, Zap, Loader2, Wifi, BarChart2
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { getSocket, joinOwnerRoom } from './utils/socket';
import { downloadCsv } from './utils/exportCsv';
import ThemeToggle from './ThemeToggle';
import TrustProfileCard from './TrustProfileCard';

const OwnerDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'bookings' | 'payouts'
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveAlert, setLiveAlert] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState(null);
  const [selectedEscrowRental, setSelectedEscrowRental] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Payout & Bank Withdrawal Suite
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('upi'); // 'upi' | 'bank'
  const [upiId, setUpiId] = useState('partner@okhdfcbank');
  const [bankAcc, setBankAcc] = useState('50100489218492');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001824');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [payoutTransactions, setPayoutTransactions] = useState([
    {
      id: 'PAY-8921',
      date: '2026-09-05',
      amount: 4250,
      method: 'UPI (partner@okhdfcbank)',
      utr: 'UTR-RTGS-92840192',
      status: 'COMPLETED'
    },
    {
      id: 'PAY-7412',
      date: '2026-08-05',
      amount: 3800,
      method: 'Bank Transfer (HDFC...8492)',
      utr: 'UTR-NEFT-81928410',
      status: 'COMPLETED'
    }
  ]);

  const [formData, setFormData] = useState({
    rental_name: '',
    category_id: 'Appliances',
    sub_category: 'Refrigerators',
    brand: '',
    monthly_price: '',
    security_deposit: '',
    stock_quantity: '1',
    available_cities: 'Hyderabad, Bangalore, Mumbai, Delhi, Pune',
    image_url: '',
    description: ''
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/owner/dashboard/');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        console.error('Failed to load owner dashboard');
      }
    } catch (err) {
      console.error('Error fetching owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const socket = getSocket();
    const userInfoStr = localStorage.getItem('user');
    let userId = null;
    try {
      if (userInfoStr) userId = JSON.parse(userInfoStr).id || JSON.parse(userInfoStr)._id;
    } catch (e) {}

    joinOwnerRoom(userId);

    if (socket) {
      setSocketConnected(socket.connected);
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      socket.on('order:owner_item_rented', (data) => {
        setLiveAlert({
          title: '🎉 New Booking on Your Appliance!',
          text: `Customer ${data.customer_name} rented "${data.rental_name}". Your monthly net payout share: ₹${data.owner_earnings.toLocaleString()}/mo!`
        });
        loadDashboard();
      });

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('order:owner_item_rented');
      };
    }
  }, []);

  useEffect(() => {
    if (liveAlert) {
      const timer = setTimeout(() => setLiveAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [liveAlert]);

  const handleBookingDecision = async (rentalId, decision) => {
    try {
      const res = await fetchWithAuth(`/api/owner/bookings/${rentalId}/${decision}`, {
        method: 'POST',
        body: JSON.stringify({ reason: decision === 'reject' ? 'Declined after reviewing renter Trust Profile' : '' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast.success(data.success || `Booking ${decision}ed`, 'Owner Approval');
        fetchDashboard();
      } else {
        showToast.error(data.error || 'Action failed', 'Error');
      }
    } catch (err) {
      showToast.error('Network error processing approval', 'Error');
    }
  };

  const handleOpenAdd = () => {
    setEditingAppliance(null);
    setFormData({
      rental_name: '',
      category_id: 'Appliances',
      sub_category: 'Refrigerators',
      brand: '',
      monthly_price: '',
      security_deposit: '',
      stock_quantity: '1',
      available_cities: 'Hyderabad, Bangalore, Mumbai, Delhi, Pune',
      image_url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&q=80&w=600',
      description: 'Well-maintained appliance rented directly from certified peer owner with free doorstep delivery.'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (app) => {
    setEditingAppliance(app);
    setFormData({
      rental_name: app.rental_name || '',
      category_id: app.category_id || 'Appliances',
      sub_category: app.sub_category || 'General',
      brand: app.brand || '',
      monthly_price: app.monthly_price || '',
      security_deposit: app.security_deposit || '',
      stock_quantity: app.stock_quantity || '1',
      available_cities: Array.isArray(app.available_cities) ? app.available_cities.join(', ') : 'Bangalore, Mumbai',
      image_url: app.image_url || '',
      description: app.description || ''
    });
    setShowAddModal(true);
  };

  const handleToggleListingStatus = async (app) => {
    try {
      const targetId = app.appliance_id || app._id;
      const nextStock = app.stock_quantity > 0 ? 0 : 1;
      const res = await fetchWithAuth(`/api/owner/appliances/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: nextStock })
      });
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Listing status updated to ${nextStock > 0 ? 'ACTIVE' : 'PAUSED'}.`
        });
        loadDashboard();
        setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
      }
    } catch (e) {
      console.error('Error toggling status:', e);
    }
  };

  const handleDeleteListing = async (appId) => {
    if (!window.confirm('Are you sure you want to remove this appliance listing?')) return;
    try {
      const res = await fetchWithAuth(`/api/owner/appliances/${appId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Listing removed successfully!' });
        loadDashboard();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to remove listing' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error deleting listing' });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setActionMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        monthly_price: parseFloat(formData.monthly_price) || 500,
        security_deposit: parseFloat(formData.security_deposit) || Math.round((parseFloat(formData.monthly_price) || 500) * 1.5),
        stock_quantity: parseInt(formData.stock_quantity, 10) || 1,
        available_cities: formData.available_cities.split(',').map(c => c.trim()).filter(Boolean)
      };

      const url = editingAppliance
        ? `/api/owner/appliances/${editingAppliance.appliance_id || editingAppliance._id}`
        : '/api/owner/appliances/';
      const method = editingAppliance ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setActionMessage({ 
          type: 'success', 
          text: editingAppliance ? 'Appliance listing updated!' : 'New appliance listed successfully on the catalog!' 
        });
        loadDashboard();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to save appliance' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Error saving listing: ' + err.message });
    } finally {
      setFormSubmitting(false);
    }
  };

  const switchToCustomer = async () => {
    try {
      await fetchWithAuth('/api/auth/switch-role/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'customer' })
      });
      navigate('/');
    } catch (e) {
      navigate('/');
    }
  };

  const handleExportEarningsCSV = () => {
    const activeBookings = dashboardData?.active_bookings || [];
    if (activeBookings.length === 0) {
      showToast.info("No active booking earnings to export yet.", "Export Unavailable");
      return;
    }
    const headers = ["Booking ID", "Appliance Name", "Monthly Rent (INR)", "Owner Net Share (85%)", "Platform Commission (15%)", "Tenure (Months)", "Status", "Rented Date"];
    const rows = activeBookings.map(b => [
      `"${b._id || b.rental_id || 'BK-101'}"`,
      `"${(b.appliance_name || 'Appliance').replace(/"/g, '""')}"`,
      b.monthly_rent || 0,
      b.owner_share || Math.round((b.monthly_rent || 0) * 0.85),
      Math.round((b.monthly_rent || 0) * 0.15),
      b.tenure || 3,
      b.status || 'ACTIVE',
      b.rented_at ? new Date(b.rented_at).toISOString().split('T')[0] : 'Recent'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rentora_Partner_Earnings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteWithdrawal = async (e) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount) || 0;
    if (amt <= 0) {
      showToast.error("Please enter a valid withdrawal amount.", "Invalid Amount");
      return;
    }
    setWithdrawLoading(true);
    try {
      const res = await fetchWithAuth('/api/owner/withdraw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: withdrawMethod,
          upi_id: upiId,
          bank_account: bankAcc,
          ifsc: bankIfsc
        })
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.payout || {};
        const newTx = {
          id: p.payout_id || `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().split('T')[0],
          amount: amt,
          method: withdrawMethod === 'upi' ? `UPI (${upiId})` : `Bank Transfer (Acc: ...${bankAcc.slice(-4)})`,
          utr: p.utr || `UTR-IMPS-${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: 'COMPLETED'
        };
        setPayoutTransactions(prev => [newTx, ...prev]);
        setShowWithdrawModal(false);
        setWithdrawSuccess({
          amount: amt,
          utr: newTx.utr,
          method: newTx.method
        });
        loadDashboard();
        setTimeout(() => setWithdrawSuccess(null), 8000);
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to process withdrawal', 'Withdrawal Failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      showToast.error('Network error submitting withdrawal', 'Network Error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="animate-spin" color="#10b981" />
          <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Loading Owner Hub...</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {
    total_listings: 0,
    active_rented_units: 0,
    total_earnings: 0,
    monthly_projected_payout: 0,
    platform_commission_pct: 15
  };

  const appliances = dashboardData?.my_appliances || [];
  const bookings = dashboardData?.active_bookings || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', paddingBottom: '4rem' }}>
      {/* Top Navigation */}
      <header className="dashboard-header">
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #e23744 0%, #b91c1c 100%)',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '1.25rem',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 4px 10px rgba(226, 55, 68, 0.3)'
              }}>
                R
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Rent<span style={{ color: 'var(--primary-color)' }}>ora</span>
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>Partner Hub</span>
              </div>
            </Link>

            <Link to="/" className="nav-action-btn">
              <ArrowLeft size={15} />
              <span>Catalog</span>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Live WebSocket Status Indicator */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              background: socketConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${socketConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: socketConnected ? '#10b981' : '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: socketConnected ? '#10b981' : '#ef4444',
                boxShadow: socketConnected ? '0 0 8px #10b981' : 'none',
                display: 'inline-block'
              }} />
              <Wifi size={13} />
              <span>{socketConnected ? 'Live Socket Active' : 'Connecting...'}</span>
            </div>

            <button
              onClick={switchToCustomer}
              className="nav-action-btn"
              title="Switch your active role to Customer to rent items"
            >
              <span>Customer View</span>
              <ChevronRight size={14} />
            </button>

            <ThemeToggle />

            <button
              onClick={handleOpenAdd}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <PlusCircle size={16} />
              <span>+ List Appliance</span>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time live booking alert banner */}
      {liveAlert && (
        <div style={{
          background: 'linear-gradient(90deg, #064e3b, #047857)',
          color: '#ffffff',
          padding: '0.85rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          borderBottom: '2px solid #34d399',
          zIndex: 40,
          position: 'sticky',
          top: '57px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#065f46', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
              <Sparkles size={18} color="#facc15" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', marginRight: '0.5rem' }}>
                {liveAlert.title}:
              </span>
              <span style={{ fontSize: '0.84rem', color: '#d1fae5' }}>
                {liveAlert.text}
              </span>
            </div>
          </div>
          <button
            onClick={() => setLiveAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a7f3d0',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {/* Banner Alert if any */}
        {actionMessage.text && (
          <div style={{
            background: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage({ type: '', text: '' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Hero Title & Welcome */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            Welcome back, {dashboardData?.owner?.username || 'Owner'} 👋
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Monetize your appliances and furniture. Rentora manages customer verification, KYC, doorstep logistics, and escrows.
          </p>
        </div>

        {/* KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          {/* Card 1: Total Earnings */}
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: '16px',
            padding: '1.4rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Net Earnings</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} color="#10b981" />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ₹{metrics.total_earnings.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#10b981', fontWeight: 600, marginTop: '0.35rem' }}>
              85% owner payout disbursed monthly
            </div>
          </div>

          {/* Card 2: Projected Monthly Payout */}
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: '16px',
            padding: '1.4rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monthly Passive Run-Rate</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#2563eb" />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ₹{metrics.monthly_projected_payout.toLocaleString()}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/mo</span>
            </div>
            <div style={{ fontSize: '0.775rem', color: '#2563eb', fontWeight: 600, marginTop: '0.35rem' }}>
              From {metrics.active_rented_units} actively rented unit(s)
            </div>
          </div>

          {/* Card 3: Active Rented Units */}
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: '16px',
            padding: '1.4rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Currently Rented Units</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#d97706" />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.active_rented_units}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#d97706', fontWeight: 600, marginTop: '0.35rem' }}>
              Protected by ₹10,000 Rentora Damage Shield
            </div>
          </div>

          {/* Card 4: Total Listed Appliances */}
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: '16px',
            padding: '1.4rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>My Total Listings</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={20} color="#7c3aed" />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.total_listings}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#7c3aed', fontWeight: 600, marginTop: '0.35rem' }}>
              Live in active customer catalog
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem'
        }}>
          <div className="dashboard-nav-pills">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`dashboard-pill ${activeTab === 'inventory' ? 'active' : ''}`}
            >
              <Package size={17} />
              <span>My Listed Appliances</span>
              <span className="dashboard-badge" style={{
                background: activeTab === 'inventory' ? 'var(--primary-color)' : 'var(--surface-muted)',
                color: activeTab === 'inventory' ? '#ffffff' : 'var(--text-secondary)'
              }}>
                {appliances.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`dashboard-pill ${activeTab === 'bookings' ? 'active' : ''}`}
            >
              <Users size={17} />
              <span>Customer Bookings</span>
              <span className="dashboard-badge" style={{
                background: activeTab === 'bookings' ? 'var(--primary-color)' : 'var(--surface-muted)',
                color: activeTab === 'bookings' ? '#ffffff' : 'var(--text-secondary)'
              }}>
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`dashboard-pill ${activeTab === 'payouts' ? 'active' : ''}`}
            >
              <DollarSign size={17} />
              <span>Payout Policy & Escrow</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Appliance Listings */}
        {activeTab === 'inventory' && (
          <div>
            {appliances.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <Package size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>
                  No appliances listed yet
                </h3>
                <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  Have an extra refrigerator, AC, smart TV, or sofa set? List it in under 2 minutes and start earning monthly passive rental income.
                </p>
                <button
                  onClick={handleOpenAdd}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + List Your First Appliance
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem'
              }}>
                {appliances.map(app => (
                  <div key={app._id} style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ position: 'relative', height: '180px', background: '#f1f5f9' }}>
                      <img 
                        src={app.image_url || 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=500'} 
                        alt={app.rental_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: (app.stock_quantity > 0) ? '#10b981' : '#f59e0b',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px'
                      }}>
                        {app.stock_quantity > 0 ? `In Stock (${app.stock_quantity})` : 'Rented Out'}
                      </span>
                    </div>

                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        {app.category_id} • {app.sub_category || 'General'}
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                        {app.rental_name}
                      </h4>
                      <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {app.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Monthly Rent</span>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>₹{app.monthly_price}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/mo</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Deposit</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>₹{app.security_deposit || Math.round(app.monthly_price * 1.5)}</span>
                        </div>
                      </div>

                      {/* Status Toggle (Active / Paused) */}
                      <button
                        type="button"
                        onClick={() => handleToggleListingStatus(app)}
                        style={{
                          background: app.stock_quantity > 0 ? '#ecfdf5' : '#fffbeb',
                          color: app.stock_quantity > 0 ? '#059669' : '#b45309',
                          border: `1px solid ${app.stock_quantity > 0 ? '#a7f3d0' : '#fde68a'}`,
                          padding: '0.45rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                        title="Toggle listing availability between Active and Paused"
                      >
                        <span style={{ fontSize: '0.65rem' }}>●</span>
                        <span>{app.stock_quantity > 0 ? 'Status: Active in Catalog (Click to Pause)' : 'Status: Paused (Click to Activate)'}</span>
                      </button>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(app)}
                          style={{
                            flex: 1,
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteListing(app.appliance_id || app._id)}
                          style={{
                            background: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete Listing"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Bookings */}
        {activeTab === 'bookings' && (
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Customer Leases on Your Items</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Rentora deposits your 85% share directly every month while the lease remains active.
                </p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b' }}>
                <Clock size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No active customer bookings yet on your listed items.</p>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>When a customer checks out your appliance, it will appear here with renter details and revenue share.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Appliance</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Customer</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Gross Rent</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Your Share (85%)</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Tenure</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Booking Date</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Escrow Ledger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                          {b.appliance_name}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#334155', minWidth: '240px' }}>
                          <div style={{ fontWeight: 700 }}>{b.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>{b.customer_email}</div>
                          {b.renter_trust && (
                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.72rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                                  Trust Score: <span style={{ color: b.renter_trust.trust_score >= 75 ? '#059669' : '#d97706' }}>{b.renter_trust.trust_score}/100</span>
                                </span>
                                {b.renter_trust.verifications?.phone_verified && (
                                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                    Phone Verified ✓
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#64748b' }}>
                                Joined {b.renter_trust.joined_at} • {b.renter_trust.stats?.rentals_completed ?? 0} completed • {b.renter_trust.stats?.avg_rating ? `${b.renter_trust.stats.avg_rating}★` : 'New'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>
                          <div>₹{b.monthly_rent}</div>
                          {b.security_deposit > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Deposit: ₹{b.security_deposit}</div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#10b981' }}>
                          ₹{b.owner_share}/mo
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {b.tenure} Months
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            background: b.status === 'active' ? '#ecfdf5' : b.status === 'pending_approval' ? '#fef3c7' : b.status === 'rejected' ? '#fef2f2' : '#f1f5f9',
                            color: b.status === 'active' ? '#059669' : b.status === 'pending_approval' ? '#b45309' : b.status === 'rejected' ? '#dc2626' : '#64748b',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            display: 'inline-block',
                            marginBottom: b.status === 'pending_approval' ? '0.4rem' : 0
                          }}>
                            {b.status === 'pending_approval' ? 'Pending Approval' : b.status}
                          </span>
                          {b.status === 'pending_approval' && (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => handleBookingDecision(b.rental_id || b._id, 'approve')}
                                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBookingDecision(b.rental_id || b._id, 'reject')}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {b.rented_at ? new Date(b.rented_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedEscrowRental({
                              rental_id: b.rental_id || b._id,
                              appliance: { rental_name: b.appliance_name },
                              security_deposit: b.security_deposit || 750,
                              deposit_status: 'HELD'
                            })}
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              borderRadius: '6px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Inspect security deposit ledger and refund state"
                          >
                            <ShieldCheck size={12} color="#059669" />
                            <span>Escrow Ledger</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payouts & Escrow Overview */}
        {activeTab === 'payouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Withdrawal Success Alert */}
            {withdrawSuccess && (
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: '#065f46',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={24} color="#059669" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                    Withdrawal Initiated Successfully! ⚡
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: '#047857' }}>
                    ₹{withdrawSuccess.amount.toLocaleString()} transferred to <strong>{withdrawSuccess.method}</strong> • Bank Ref / UTR: <strong style={{ fontFamily: 'monospace' }}>{withdrawSuccess.utr}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Payout Summary & Instant Withdrawal Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
              borderRadius: '16px',
              padding: '2rem',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
              boxShadow: '0 10px 25px rgba(6, 78, 59, 0.25)'
            }}>
              <div>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Net Escrow Partner Yield
                </span>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, margin: '0.6rem 0 0.2rem', letterSpacing: '-0.02em' }}>
                  ₹{(metrics.total_earnings || 4250).toLocaleString()}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
                  Available balance ready for instant bank / UPI disbursement. Zero withdrawal processing fees.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAmount(String(metrics.total_earnings || 4250));
                    setShowWithdrawModal(true);
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#065f46',
                    border: 'none',
                    padding: '0.75rem 1.35rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Zap size={16} color="#059669" />
                  <span>Request Instant Payout</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportEarningsCSV}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '0.75rem 1.15rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                >
                  <Download size={15} />
                  <span>Download Statement (CSV)</span>
                </button>
              </div>
            </div>

            {/* Visual Yield Analytics: 6-Month Peer Earnings & Revenue Split */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={20} color="#059669" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Earnings Yield & Revenue Split (Recharts Visual Analytics)
                    </h3>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                    Transparent breakdown of your 85% net host payout vs. 15% Rentora platform insurance & logistics fee.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#15803d'
                  }}>
                    <span>Your Share: 85%</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#4338ca'
                  }}>
                    <span>Platform Fee: 15%</span>
                  </div>
                </div>
              </div>

              {/* Responsive BarChart */}
              <div style={{ width: '100%', height: 290 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { month: "May '26", owner_payout: 2720, platform_fee: 480 },
                      { month: "Jun '26", owner_payout: 3485, platform_fee: 615 },
                      { month: "Jul '26", owner_payout: 4080, platform_fee: 720 },
                      { month: "Aug '26", owner_payout: 4590, platform_fee: 810 },
                      { month: "Sep '26", owner_payout: 5185, platform_fee: 915 },
                      { 
                        month: "Oct '26 (Proj)", 
                        owner_payout: Math.max(metrics.monthly_projected_payout || 5780, 5780), 
                        platform_fee: Math.round(Math.max(metrics.monthly_projected_payout || 5780, 5780) * 0.176) 
                      }
                    ]}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString()}`, 
                        name === 'owner_payout' ? 'Owner Net Payout (85%)' : 'Rentora Fee (15%)'
                      ]}
                      contentStyle={{
                        background: '#0f172a',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        fontSize: '0.82rem',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '0.8rem', fontWeight: 600 }}
                      formatter={(val) => val === 'owner_payout' ? 'Owner Net Payout (85%)' : 'Platform Fee (15%)'}
                    />
                    <Bar 
                      dataKey="owner_payout" 
                      fill="#059669" 
                      radius={[6, 6, 0, 0]} 
                      name="owner_payout" 
                    />
                    <Bar 
                      dataKey="platform_fee" 
                      fill="#6366f1" 
                      radius={[6, 6, 0, 0]} 
                      name="platform_fee" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payout Transactions Ledger */}
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Disbursement & Payout History
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                    Transparent transaction records with automated bank UTR reference codes.
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                  100% Settled
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Transaction ID</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Disbursement Method</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Amount</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Bank Reference (UTR)</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutTransactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{tx.id}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{tx.date}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>{tx.method}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#059669' }}>₹{tx.amount.toLocaleString()}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{tx.utr}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Partner Assurance & Policies */}
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Rentora Owner Protection & Payout Guarantee
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <ShieldCheck size={28} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 700, color: '#1e293b' }}>₹10,000 Damage Shield</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                    Every appliance you list is covered by the platform's accidental damage waiver. If a customer damages your appliance, Rentora covers certified repairs.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <DollarSign size={28} color="#2563eb" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 700, color: '#1e293b' }}>85% Revenue Share</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                    You receive 85% of all rental payments collected. The 15% platform commission covers doorstep delivery, customer KYC verification, and digital payment gateway fees.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <Clock size={28} color="#7c3aed" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 700, color: '#1e293b' }}>Automated Monthly Payouts</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                    Earnings are credited automatically by the 5th of each calendar month directly into your registered bank account or UPI VPA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Appliance Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingAppliance ? 'Edit Listed Appliance' : 'List New Appliance for Rent'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Fill in the details to publish your item to the Rentora customer catalog.
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Appliance / Furniture Title *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Samsung Double Door Frost Free Refrigerator 253L"
                  value={formData.rental_name}
                  onChange={e => setFormData({ ...formData, rental_name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select 
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                  >
                    <option value="Appliances">Appliances</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Living Room">Living Room</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Office">Office & Study</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Brand Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. LG, Whirlpool, Sony"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Monthly Rent (₹) *
                  </label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 799"
                    value={formData.monthly_price}
                    onChange={e => setFormData({ ...formData, monthly_price: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Deposit (₹)
                  </label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1200"
                    value={formData.security_deposit}
                    onChange={e => setFormData({ ...formData, security_deposit: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Available Units
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Available Cities (Comma separated)
                </label>
                <input 
                  type="text" 
                  value={formData.available_cities}
                  onChange={e => setFormData({ ...formData, available_cities: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Photo URL
                </label>
                <input 
                  type="url" 
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Item Description & Condition
                </label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {formSubmitting ? 'Publishing...' : (editingAppliance ? 'Save Changes' : 'Publish Listing')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Payout Withdrawal Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              padding: '1.5rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: '10px' }}>
                  <Zap size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Instant Partner Payout</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85 }}>Direct disbursement via NPCI IMPS / UPI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleExecuteWithdrawal} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    Withdrawal Amount (INR)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                    Available: ₹{(metrics.total_earnings || 4250).toLocaleString()}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>₹</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    min="100"
                    max={metrics.total_earnings || 4250}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.2rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Quick amount chips */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {['1000', '2500', String(metrics.total_earnings || 4250)].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWithdrawAmount(val)}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {val === String(metrics.total_earnings || 4250) ? 'Full Balance' : `₹${val}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Channel Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Disbursement Channel
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('upi')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: `2px solid ${withdrawMethod === 'upi' ? '#059669' : '#e2e8f0'}`,
                      background: withdrawMethod === 'upi' ? '#ecfdf5' : '#ffffff',
                      color: withdrawMethod === 'upi' ? '#065f46' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <Zap size={16} />
                    <span>Instant UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: `2px solid ${withdrawMethod === 'bank' ? '#059669' : '#e2e8f0'}`,
                      background: withdrawMethod === 'bank' ? '#ecfdf5' : '#ffffff',
                      color: withdrawMethod === 'bank' ? '#065f46' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <CreditCard size={16} />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {withdrawMethod === 'upi' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    placeholder="e.g. partner@okhdfcbank"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    Funds are credited in under 60 seconds directly into your linked bank account.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAcc}
                      onChange={(e) => setBankAcc(e.target.value)}
                      required
                      placeholder="Account number..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      required
                      placeholder="e.g. HDFC0001824"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ShieldCheck size={16} color="#059669" />
                <span>Protected by 256-bit SSL automated deposit clearing.</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: withdrawLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {withdrawLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing Payout...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Confirm & Disburse ₹{withdrawAmount || '0'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default OwnerDashboard;
