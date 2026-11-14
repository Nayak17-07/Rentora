import { showToast } from './utils/toast';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  MessageCircle,
  Sparkles,
  Bot,
  X,
  Send,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Award,
  ArrowRight,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw,
  Wrench,
  MapPin,
  ExternalLink,
  Zap
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

const DEFAULT_CHIPS = [
  "💡 1 BHK Setup under ₹1,500",
  "🛡️ Damage Waiver Policy",
  "🚚 Free City Shifting",
  "💎 How Rent-to-Own Works",
  "📦 Track My Delivery"
];

export default function RentoraConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: "👋 Hi! I'm your **Rentora Smart Concierge**.\n\nI can help you find curated packages for your budget, explain our ₹10,000 damage waiver, or handle free inter-city shifting. How can I help you today?",
      suggestedChips: DEFAULT_CHIPS,
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingCardId, setAddingCardId] = useState(null);
  const [addedCardId, setAddedCardId] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Context name helper
  const getContextName = () => {
    const path = location.pathname;
    if (path === '/') return 'Catalog & Combos';
    if (path === '/rentals') return 'My Rentals & Deliveries';
    if (path === '/cart') return 'Shopping Bag & Checkout';
    if (path === '/kyc') return 'KYC Verification';
    if (path === '/admin') return 'Admin Portal';
    return 'Rentora Platform';
  };

  const handleSendMessage = async (userText) => {
    const query = (userText || inputVal).trim();
    if (!query || loading) return;

    setInputVal('');
    const userMsgId = `user-${Date.now()}`;
    const newMsgList = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: query,
        timestamp: new Date()
      }
    ];
    setMessages(newMsgList);
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            currentPath: location.pathname,
            contextName: getContextName()
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: data.reply,
            recommendations: data.recommendations || [],
            action: data.action || null,
            suggestedChips: data.suggestedChips || DEFAULT_CHIPS,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error('Backend failed');
      }
    } catch (err) {
      console.warn("Concierge backend offline or error, using local smart fallback:", err);
      // Smart offline fallback
      let fallbackReply = "Our policies include: (1) ₹10,000 accidental damage waiver with ₹0 deduction, (2) Free inter-city relocation across 8 cities after 6 months, and (3) 70% rent-to-own equity credits!";
      let fallbackAction = { type: 'VIEW_CATALOG', label: '🔍 Browse Appliances' };

      if (query.toLowerCase().includes('damage') || query.toLowerCase().includes('scratch')) {
        fallbackReply = "🛡️ **Damage Waiver Policy**\n\nAccidental spills, minor fabric tears, and electronic surges are protected up to ₹10,000 at zero deduction from your security deposit.";
        fallbackAction = { type: 'OPEN_MAINTENANCE', label: '🛠️ Book Free Inspection' };
      } else if (query.toLowerCase().includes('relocat') || query.toLowerCase().includes('shift')) {
        fallbackReply = "🚚 **Free City Relocation**\n\nEnjoy 100% free doorstep packing, transit insurance, and setup across 8 metro hubs after 6 months of active rental.";
        fallbackAction = { type: 'OPEN_RELOCATION', label: '🚚 Open Relocation' };
      } else if (query.toLowerCase().includes('buyout') || query.toLowerCase().includes('own')) {
        fallbackReply = "💎 **Rent-to-Own Buyout**\n\n70% of all accumulated rental payments are credited toward permanent ownership, with your deposit offset from the balance.";
        fallbackAction = { type: 'NAVIGATE_RENTALS', label: '💎 Open Buyout Engine' };
      } else if (query.toLowerCase().includes('track') || query.toLowerCase().includes('delivery')) {
        fallbackReply = "📦 **Delivery Tracking**\n\nYou can track the live status of your appliance dispatch, view OTPs, and see the technician's ETA directly from your Rentals dashboard.";
        fallbackAction = { type: 'NAVIGATE_RENTALS', label: '📦 Track My Delivery' };
      } else if (query.toLowerCase().includes('1 bhk') || query.toLowerCase().includes('setup')) {
        fallbackReply = "💡 **1 BHK Setups**\n\nWe have amazing combo packages! For under ₹1,500/month, you can rent a fully automatic washing machine, a smart fridge, and a microwave.";
        fallbackAction = { type: 'VIEW_CATALOG', label: '🔍 View Combos' };
      }

      setMessages(prev => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: fallbackReply,
          action: fallbackAction,
          suggestedChips: DEFAULT_CHIPS,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;
    if (action.type === 'NAVIGATE_RENTALS') {
      navigate('/rentals');
      setIsMinimized(true);
    } else if (action.type === 'NAVIGATE_CART') {
      navigate('/cart');
      setIsMinimized(true);
    } else if (action.type === 'VIEW_CATALOG') {
      navigate('/');
      setIsMinimized(true);
    } else if (action.type === 'OPEN_RELOCATION' || action.type === 'OPEN_MAINTENANCE') {
      navigate('/rentals');
      setIsMinimized(true);
    } else if (action.type === 'CHECK_PINCODE') {
      navigate('/');
      window.dispatchEvent(new CustomEvent('open-pincode-modal'));
    }
  };

  const handleAddToCart = async (item) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast.info("Please log in to add items to your cart.", "Authentication Required");
      navigate('/login');
      return;
    }

    setAddingCardId(item.appliance_id);
    try {
      const res = await fetchWithAuth('/api/cart/', {
        method: 'POST',
        body: JSON.stringify({
          appliance_id: item.appliance_id,
          tenure: '3',
          bundle_data: {
            appliance_id: item.appliance_id,
            rental_name: item.rental_name,
            monthly_price: item.monthly_price,
            category_id: item.category_id || 'Appliances',
            image_url: item.image_url,
            security_deposit: item.security_deposit || 500
          }
        })
      });

      if (res.ok) {
        setAddedCardId(item.appliance_id);
        setTimeout(() => setAddedCardId(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast.error(err.error || "Could not add item to cart.", "Cart Error");
      }
    } catch (e) {
      console.error("Cart addition error:", e);
      showToast.error("Error adding item to cart.", "Cart Error");
    } finally {
      setAddingCardId(null);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'msg-cleared',
        sender: 'assistant',
        text: "Chat cleared! What questions or appliance requirements can I help you with?",
        suggestedChips: DEFAULT_CHIPS,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <>
      {/* 1. Floating Trigger Button */}
      {/* 1. Floating Trigger Button (Industry-standard chat widget style) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setHasUnread(false);
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '56px',
            height: '56px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.38), 0 2px 6px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'scale(1)'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.background = '#1d4ed8';
            e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)'; 
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.45), 0 2px 8px rgba(0, 0, 0, 0.12)'; 
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.background = '#2563eb';
            e.currentTarget.style.transform = 'scale(1) translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.38), 0 2px 6px rgba(0, 0, 0, 0.08)'; 
          }}
          aria-label="Open Chat Support"
          title="Chat Support"
        >
          <MessageSquare size={24} color="#ffffff" fill="#ffffff" />
        </button>
      )}

      {/* 2. Floating Concierge Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10000,
          width: '390px',
          maxWidth: 'calc(100vw - 32px)',
          height: isMinimized ? '60px' : '620px',
          maxHeight: 'calc(100vh - 48px)',
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '20px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'inherit'
        }}>
          
          {/* Header */}
          <div style={{
            background: '#2563eb',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            cursor: 'pointer'
          }}
          onClick={() => { if (isMinimized) setIsMinimized(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={18} color="#ffffff" fill="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Rentora Concierge</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span>Online • Ready to help</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                title="Clear Conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                title={isMinimized ? "Expand" : "Minimize"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <ChevronDown size={16} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chat Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: '#090d16'
              }}>
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        gap: '0.35rem'
                      }}
                    >
                      {/* Bubble */}
                      <div style={{
                        maxWidth: '86%',
                        padding: '0.75rem 0.95rem',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isUser
                          ? '#2563eb'
                          : '#1e293b',
                        color: '#ffffff',
                        fontSize: '0.825rem',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {m.text}
                      </div>

                      {/* Autonomous Action Trigger Button */}
                      {m.action && (
                        <button
                          type="button"
                          onClick={() => handleActionClick(m.action)}
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.5rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '0.2rem',
                            boxShadow: '0 3px 8px rgba(217, 119, 6, 0.3)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <span>{m.action.label}</span>
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {/* Interactive Recommendation Cards */}
                      {m.recommendations && m.recommendations.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          marginTop: '0.5rem',
                          width: '100%'
                        }}>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚡ Instant 1-Click Cart Addition:
                          </div>

                          {m.recommendations.map(item => {
                            const isAdding = addingCardId === item.appliance_id;
                            const isAdded = addedCardId === item.appliance_id;

                            return (
                              <div
                                key={item.appliance_id}
                                style={{
                                  background: '#131c2e',
                                  border: '1px solid #1e293b',
                                  borderRadius: '12px',
                                  padding: '0.65rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <img
                                  src={item.image_url}
                                  alt={item.rental_name}
                                  style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    background: '#1e293b',
                                    flexShrink: 0
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80';
                                  }}
                                />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {item.rental_name}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                                      ₹{item.monthly_price}/mo
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                      • Dep: ₹{item.security_deposit}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  disabled={isAdding || isAdded}
                                  style={{
                                    background: isAdded ? '#10b981' : '#3b82f6',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.45rem 0.65rem',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: isAdded ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isAdding ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : isAdded ? (
                                    <>
                                      <Check size={12} />
                                      <span>Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart size={12} />
                                      <span>Add</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Suggested Chips */}
                      {m.suggestedChips && m.suggestedChips.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.35rem',
                          marginTop: '0.35rem'
                        }}>
                          {m.suggestedChips.map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(chip)}
                              style={{
                                background: '#1e293b',
                                color: '#93c5fd',
                                border: '1px solid #334155',
                                borderRadius: '20px',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#334155';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#1e293b';
                                e.currentTarget.style.color = '#93c5fd';
                              }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.76rem', padding: '0.5rem 0' }}>
                    <Loader2 size={14} className="animate-spin" color="#818cf8" />
                    <span>Rentora is checking policies & live catalog...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input Footer */}
              <div style={{
                padding: '0.75rem',
                background: '#0f172a',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Ask about damage waiver, shifting, or 1BHK setup..."
                    style={{
                      flex: 1,
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.8rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
                  />

                  <button
                    type="submit"
                    disabled={!inputVal.trim() || loading}
                    style={{
                      background: inputVal.trim() && !loading
                        ? '#2563eb'
                        : '#334155',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputVal.trim() && !loading ? 'pointer' : 'not-allowed',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.64rem', color: '#64748b', marginTop: '0.45rem' }}>
                  Rentora Autonomous Assistant • 24/7 Tenant Support
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </>
  );
}
