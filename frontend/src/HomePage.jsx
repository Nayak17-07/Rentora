import { showToast } from './utils/toast';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  Sparkles, 
  Loader2, 
  ShoppingCart, 
  Check, 
  MapPin, 
  Search, 
  X, 
  Heart, 
  Truck, 
  ChevronDown, 
  ChevronRight, 
  Headphones, 
  Phone, 
  MessageSquare, 
  ArrowUpRight, 
  Package, 
  Zap, 
  ShieldCheck, 
  Award, 
  ArrowRight, 
  CornerDownLeft, 
  Briefcase, 
  Lock, 
  History,
  Clock,
  Flame,
  Trash2,
  Star,
  Plus,
  Eye
} from 'lucide-react';
import { fetchWithAuth, publicFetch } from './utils/api';
import { getSocket } from './utils/socket';
import CitySelectionModal from './CitySelectionModal';
import ProductDetailsModal from './ProductDetailsModal';
import RecentlyViewedSection from './RecentlyViewedSection';
import { trackApplianceView } from './utils/browsingHistory';
import { CategoryIcon } from './CategoryIcons';
import { AssuranceBanner } from './AssuranceBanner';
import { RentVsBuyCalculator } from './RentVsBuyCalculator';
import CuratedRoomCombos from './CuratedRoomCombos';
import ThemeToggle from './ThemeToggle';

const TOP_CATEGORIES = [
  { name: "Packages", query: "Package", category: "Packages" },
  { name: "Water Purifiers", query: "Purifier", category: "Appliances" },
  { name: "Beds", query: "Bed", category: "Bedroom" },
  { name: "Sofas", query: "Sofa", category: "Living Room" },
  { name: "Mattresses", query: "Mattress", category: "Bedroom" },
  { name: "Wardrobe & Organizer", query: "Wardrobe", category: "Bedroom" },
  { name: "Refrigerators & Freezers", query: "Refrigerator", category: "Appliances" },
  { name: "Televisions", query: "TV", category: "Appliances" },
  { name: "Washing Machines", query: "Washing Machine", category: "Appliances" },
  { name: "Air Conditioners", query: "Air Conditioner", category: "Appliances" },
  { name: "Chairs & Stools", query: "Chair", category: "Living Room" },
  { name: "Study Tables", query: "Study Table", category: "Living Room" },
  { name: "Center Tables", query: "Coffee Table", category: "Living Room" },
  { name: "Bedside Tables", query: "Side Table", category: "Bedroom" },
  { name: "Chest of Drawers", query: "Drawer", category: "Bedroom" },
  { name: "Microwaves", query: "Microwave", category: "Appliances" },
];

const MAIN_CATEGORIES = [
  "Packages",
  "Furniture",
  "Appliances",
  "Living Room",
  "Bedroom",
  "Dining Room",
  "Electronics",
  "All"
];

const SUB_CATEGORY_ICONS = [
  { name: "Refrigerators", query: "Refrigerator" },
  { name: "Washing Machines", query: "Washing Machine" },
  { name: "Water Purifiers", query: "Purifier" },
  { name: "Air Conditioners", query: "Air Conditioner" },
  { name: "Televisions", query: "TV" },
  { name: "Microwaves", query: "Microwave" },
  { name: "Sofas", query: "Sofa" },
  { name: "Beds", query: "Bed" },
  { name: "Chairs & Stools", query: "Chair" },
  { name: "Tables", query: "Table" },
];

const HomePage = ({ onLogout }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [activeRecFilter, setActiveRecFilter] = useState('for_you'); // 'for_you' | 'room_bundles' | 'trending'
  const [recLoading, setRecLoading] = useState(false);
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});
  const [wishlist, setWishlist] = useState({});
  const [cartCount, setCartCount] = useState(0);
  
  // City
  const [city, setCity] = useState(localStorage.getItem('rentora_city') || 'Hyderabad');
  const [showCityModal, setShowCityModal] = useState(!localStorage.getItem('rentora_city'));

  // Filters & State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Appliances");
  const [activeSubCategory, setActiveSubCategory] = useState("Washing Machines");
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState({ inStock: true, outOfStock: false });
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [helpOpen, setHelpOpen] = useState(false);
  const scrollToRoomCombos = () => {
    const el = document.getElementById('curated-combos-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };
  const [storeMode, setStoreMode] = useState('rent'); // 'rent' | 'refurbished'
  const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem('user_role') || 'customer');
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('username') || '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = localStorage.getItem('rentora_recent_searches');
      if (!raw) return ["Washing Machine", "Double Bed"];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed
          .map(item => (typeof item === 'string' ? item : (item?.label || item?.query || '')))
          .filter(Boolean);
        return sanitized.length > 0 ? sanitized : ["Washing Machine", "Double Bed"];
      }
      return ["Washing Machine", "Double Bed"];
    } catch {
      return ["Washing Machine", "Double Bed"];
    }
  });

  const PLACEHOLDER_TERMS = [
    'Search "Washing Machine"...',
    'Search "Double Bed with Mattress"...',
    'Search "Double Door Refrigerator"...',
    'Search "L-Shaped 5-Seater Sofa"...',
    'Search "Ergonomic Office Chair"...',
    'Search "Split Air Conditioner"...',
    'Search "55-inch 4K Smart TV"...',
    'Search "Microwave Oven"...'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TERMS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, /, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === 'k' && (e.ctrlKey || e.metaKey)) ||
        (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName))
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('main-header-search-input');
        if (searchInput) {
          searchInput.focus();
          setSearchFocused(true);
        }
      }
      if (e.key === 'Escape' && searchFocused) {
        setSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  const navigate = useNavigate();

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showUserMenu && !e.target.closest('#user-profile-menu-container')) {
        setShowUserMenu(false);
      }
      if (searchFocused && !e.target.closest('#header-search-container')) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showUserMenu, searchFocused]);

  const handleExecuteSearch = (term) => {
    const raw = typeof term === 'string' ? term : searchQuery;
    const cleanQuery = (typeof raw === 'string' ? raw : '').trim();
    if (!cleanQuery) return;

    setSearchQuery(cleanQuery);
    setSearchFocused(false);
    setSelectedCategory('All');
    setActiveSubCategory('');

    // Save to recent searches (up to 6, deduplicated, strings only)
    setRecentSearches(prev => {
      const safePrev = Array.isArray(prev)
        ? prev
            .map(item => (typeof item === 'string' ? item : (item?.label || item?.query || String(item || ''))))
            .filter(Boolean)
        : [];
      const updated = [cleanQuery, ...safePrev.filter(s => typeof s === 'string' && s.toLowerCase() !== cleanQuery.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('rentora_recent_searches', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save recent searches:', err);
      }
      return updated;
    });

    const catalog = document.getElementById('catalog-listing-section');
    if (catalog) {
      catalog.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearRecentSearches = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('rentora_recent_searches');
    } catch {}
  };

  const handleRemoveRecentSearch = (e, itemToRemove) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetString = typeof itemToRemove === 'string' ? itemToRemove : (itemToRemove?.label || itemToRemove?.query || String(itemToRemove || ''));
    setRecentSearches(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = safePrev.filter(s => {
        const str = typeof s === 'string' ? s : (s?.label || s?.query || String(s || ''));
        return str !== targetString;
      });
      try {
        localStorage.setItem('rentora_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Airbnb-Style Host / Owner Switcher
  const handleSwitchToOwner = async () => {
    try {
      setShowUserMenu(false);
      if (currentUserRole !== 'owner') {
        await fetchWithAuth('/api/auth/switch-role/', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'owner' })
        });
        setCurrentUserRole('owner');
        localStorage.setItem('user_role', 'owner');
        localStorage.setItem('is_owner', 'true');
      }
      navigate('/owner');
    } catch (e) {
      console.error("Failed to switch to owner:", e);
      navigate('/owner');
    }
  };

  const fetchData = async (selectedCity) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const userRes = await fetchWithAuth('/api/auth/me/');
        if (userRes.ok) {
          const u = await userRes.json();
          if (u.role) {
            setCurrentUserRole(u.role);
            localStorage.setItem('user_role', u.role);
          }
          if (u.username) {
            setCurrentUsername(u.username);
            localStorage.setItem('username', u.username);
          }
        }
      } catch (e) {}
    }
    
    setLoading(true);
    try {
      // Catalog (Multi-Host Fallback: localhost -> 127.0.0.1 -> Vite proxy)
      const catCityQuery = selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : '';
      let appRes = null;
      try {
        appRes = await publicFetch(`/api/appliances/${catCityQuery}`);
      } catch (e1) {
        try {
          appRes = await publicFetch(`/api/appliances/${catCityQuery}`);
        } catch (e2) {
          appRes = await fetch(`/api/appliances/${catCityQuery}`).catch(() => null);
        }
      }
      if (appRes && appRes.ok) {
        const appData = await appRes.json().catch(() => []);
        setAppliances(Array.isArray(appData) ? appData : []);
      }

      // Cart count
      if (token) {
        try {
          const cartRes = await fetchWithAuth('/api/cart/');
          if (cartRes.ok) {
            const cartData = await cartRes.json();
            setCartCount(Array.isArray(cartData) ? cartData.length : 0);
          }
        } catch (e) {}
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredRecommendations = async (filterKey, targetCity = city) => {
    try {
      setRecLoading(true);
      setActiveRecFilter(filterKey);
      const cityQuery = targetCity ? `&city=${encodeURIComponent(targetCity)}` : '';
      let recRes = null;
      try {
        recRes = await fetchWithAuth(`/api/recommendations/?filter=${filterKey}${cityQuery}`);
      } catch (authErr) {
        try {
          recRes = await publicFetch(`/api/recommendations/?filter=${filterKey}${cityQuery}`);
        } catch (e1) {
          try {
            recRes = await publicFetch(`/api/recommendations/?filter=${filterKey}${cityQuery}`);
          } catch (e2) {
            recRes = await fetch(`/api/recommendations/?filter=${filterKey}${cityQuery}`).catch(() => null);
          }
        }
      }
      if (!recRes || !recRes.ok) {
        try {
          recRes = await publicFetch(`/api/recommendations/?filter=${filterKey}${cityQuery}`);
        } catch (e) {
          recRes = await fetch(`/api/recommendations/?filter=${filterKey}${cityQuery}`).catch(() => null);
        }
      }
      if (recRes && recRes.ok) {
        const recData = await recRes.json().catch(() => []);
        setRecommendations(Array.isArray(recData) ? recData : []);
      }
    } catch (err) {
      console.error('Error filtering recommendations:', err);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchData(city);
    } else {
      setLoading(false);
    }
  }, [city, navigate]);

  // Real-Time Inventory Stock Synchronization
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStockChanged = (data) => {
      if (!data) return;
      setAppliances((prev) =>
        prev.map((item) => {
          const isMatch =
            (data.appliance_id && item.appliance_id === data.appliance_id) ||
            (data._id && item._id === data._id) ||
            (data.appliance_id && item._id === data.appliance_id) ||
            (data._id && item.appliance_id === data._id);

          if (isMatch) {
            const nextStock =
              data.new_stock !== undefined
                ? data.new_stock
                : data.action === 'decrement'
                ? Math.max(0, (item.stock_quantity || 0) - 1)
                : (item.stock_quantity || 0) + 1;
            return { ...item, stock_quantity: nextStock };
          }
          return item;
        })
      );
    };

    socket.on('catalog:stock_changed', handleStockChanged);
    return () => {
      socket.off('catalog:stock_changed', handleStockChanged);
    };
  }, []);

  const handleCitySelect = (selected) => {
    localStorage.setItem('rentora_city', selected);
    setCity(selected);
    setShowCityModal(false);
    fetchData(selected);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const addToCart = async (applianceId, tenure = "3", extraData = null) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const payload = { appliance_id: applianceId, tenure: tenure };
      if (extraData) {
        payload.bundle_data = extraData;
      }
      const res = await fetchWithAuth('/api/cart/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAddedItems(prev => ({ ...prev, [applianceId]: true }));
        setCartCount(c => c + 1);
        setSelectedProduct(null);
        setTimeout(() => {
          setAddedItems(prev => ({ ...prev, [applianceId]: false }));
        }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast.error(err.error || "Failed to add to cart", "Cart Error");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const handleRentCombo = async (combo) => {
    const comboApplianceId = `COMBO_${combo.id}`;
    const bundleData = {
      appliance_id: comboApplianceId,
      rental_name: combo.title,
      category_id: "Room Combo",
      sub_category: combo.room,
      monthly_price: combo.monthlyPrice,
      pricing: {
        "3": combo.monthlyPrice,
        "6": combo.monthlyPrice,
        "12": Math.round(combo.monthlyPrice * 0.9)
      },
      security_deposit: Math.round(combo.monthlyPrice * 1.5),
      image_url: combo.image,
      description: `Curated ${combo.room} Suite. Includes: ${combo.itemsIncluded.join(', ')} with free installation & assembly.`
    };
    await addToCart(comboApplianceId, "6", bundleData);
  };

  
  const toggleWishlist = (id, e) => {
    e.stopPropagation();
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCategoryTileClick = (cat) => {
    setSelectedCategory(cat.category);
    setActiveSubCategory(cat.name);
    setSearchQuery(cat.query);
    const catalog = document.getElementById('catalog-listing-section');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubCategoryClick = (sub) => {
    setActiveSubCategory(sub.name);
    setSearchQuery(sub.query);
    const catalog = document.getElementById('catalog-listing-section');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter logic with tokenized multi-word matching
  const filteredAppliances = (Array.isArray(appliances) ? appliances : []).filter(app => {
    if (!app) return false;
    const activeQuery = (typeof searchQuery === 'string' ? searchQuery : "").toLowerCase().trim();

    // 1. Search Query: Match across ALL fields using multi-word tokens
    if (activeQuery) {
      const words = activeQuery.split(/\s+/).filter(Boolean);
      const fullText = `${app.rental_name || ''} ${app.category_id || ''} ${app.sub_category || ''} ${app.brand || ''} ${app.description || ''}`.toLowerCase();
      const match = words.every(word => fullText.includes(word));
      if (!match) return false;
    }

    // 2. Category Filter: Apply only if NOT doing an active freeform search
    if (!activeQuery && selectedCategory && selectedCategory !== "All") {
      const selCatLower = String(selectedCategory).toLowerCase();
      const appCatLower = String(app.category_id || '').toLowerCase();
      if (selCatLower === "furniture") {
        const furnCats = ["living room", "bedroom", "dining room", "office"];
        if (!furnCats.includes(appCatLower)) return false;
      } else if (appCatLower !== selCatLower) {
        return false;
      }
    }

    // 3. Stock Status
    const inStock = (app.stock_quantity || 0) > 0;
    if (statusFilter?.inStock && !statusFilter?.outOfStock && !inStock) return false;
    if (statusFilter?.outOfStock && !statusFilter?.inStock && inStock) return false;

    // 4. Budget
    const price = app.monthly_price || 0;
    if (budgetFilter === '0-500' && (price > 500)) return false;
    if (budgetFilter === '501-1000' && (price < 501 || price > 1000)) return false;
    if (budgetFilter === '1001-5000' && (price < 1001 || price > 5000)) return false;
    if (budgetFilter === '5001+' && (price < 501)) return false;

    return true;
  });

  // Autocomplete matching items for the live header dropdown with multi-word tokens
  const searchMatches = (typeof searchQuery === 'string' && searchQuery.trim().length > 0 && Array.isArray(appliances))
    ? appliances.filter(app => {
        if (!app) return false;
        const words = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        const fullText = `${app.rental_name || ''} ${app.category_id || ''} ${app.sub_category || ''} ${app.brand || ''} ${app.description || ''}`.toLowerCase();
        return words.every(word => fullText.includes(word));
      }).slice(0, 6)
    : [];

  const POPULAR_SEARCHES = [
    { label: "Washing Machine", icon: "⚡", rank: 1, hot: true },
    { label: "Double Bed", icon: "🛏️", rank: 2, hot: true },
    { label: "Refrigerator", icon: "❄️", rank: 3, hot: true },
    { label: "L-Shaped Sofa", icon: "🛋️", rank: 4 },
    { label: "Smart TV", icon: "📺", rank: 5 },
    { label: "Air Conditioner", icon: "💨", rank: 6, tag: "Summer" },
    { label: "Water Purifier", icon: "💧", rank: 7 },
    { label: "Study Table", icon: "💻", rank: 8 }
  ];

  const QUICK_CATEGORIES = [
    { name: "Appliances", icon: "🔌", color: "#eff6ff", text: "#1d4ed8" },
    { name: "Living Room", icon: "🛋️", color: "#fef3c7", text: "#b45309" },
    { name: "Bedroom", icon: "🛏️", color: "#f3e8ff", text: "#7e22ce" },
    { name: "Packages", icon: "📦", color: "#f0fdf4", text: "#15803d" }
  ];

  // Calculate budget filter counts
  const count0_500 = appliances.filter(a => (a.monthly_price || 0) <= 500).length;
  const count501_1000 = appliances.filter(a => (a.monthly_price || 0) > 500 && (a.monthly_price || 0) <= 1000).length;
  const count1001_5000 = appliances.filter(a => (a.monthly_price || 0) > 1000 && (a.monthly_price || 0) <= 5000).length;
  const count5001_plus = appliances.filter(a => (a.monthly_price || 0) > 5000).length;
  const inStockCount = appliances.filter(a => (a.stock_quantity || 0) > 0).length;
  const outOfStockCount = appliances.filter(a => (a.stock_quantity || 0) <= 0).length;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" size={44} color="var(--primary-color)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: '#1f2937', paddingBottom: '5rem', position: 'relative' }}>
      
      {/* City Selection Modal */}
      <CitySelectionModal 
        isOpen={showCityModal} 
        onClose={() => setShowCityModal(false)} 
        onCitySelect={handleCitySelect}
        currentCity={city}
      />


      {/* Product Details / Tenure Modal */}
      {selectedProduct && (
        <ProductDetailsModal 
          appliance={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={addToCart} 
        />
      )}

      {/* ========================================================
          1. TOP NAVIGATION BAR (Clean, Polished RentoMojo Style)
          ======================================================== */}
      <header className="main-header-bar" style={{
        background: 'var(--header-bg, #ffffff)',
        borderBottom: '1px solid var(--border-color, #ebebeb)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        width: '100%',
        maxWidth: '100vw',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0.55rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Left: Logo & Location Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Logo Link to Home */}
            <Link 
              to="/" 
              style={{ 
                textDecoration: 'none', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.65rem',
                position: 'relative',
                zIndex: 1,
                boxSizing: 'border-box'
              }} 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setActiveSubCategory('All'); }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #e23744 0%, #b91c1c 100%)',
                color: 'white',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '1.35rem',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 4px 10px rgba(226, 55, 68, 0.3)'
              }}>
                R
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary-color, #111827)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Rent<span style={{ color: 'var(--primary-color, #e23744)' }}>ora</span>
              </span>
            </Link>

            {/* Subtle Divider */}
            <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 0.25rem', pointerEvents: 'none' }} />

            {/* Dedicated Location Selector Button */}
            <button
              type="button"
              id="city-picker-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCityModal(true);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
                margin: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#e23744';
                e.currentTarget.style.background = '#fff5f5';
                e.currentTarget.style.color = '#e23744';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#1f2937';
              }}
              title="Click to change your delivery city"
            >
              <MapPin size={15} color="#e23744" />
              <span>{city}</span>
              <ChevronDown size={13} color="#6b7280" />
            </button>
          </div>

          {/* Center: Live Interactive Search Bar with Floating Autocomplete */}
          <div 
            id="header-search-container"
            className="header-search-wrapper"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              width: '100%'
            }}>
              {/* Left Search Icon inside Input */}
              <Search 
                size={16} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: searchFocused ? '#e23744' : '#94a3b8',
                  pointerEvents: 'none',
                  transition: 'color 0.2s ease',
                  zIndex: 2
                }} 
              />
              <input 
                id="main-header-search-input"
                type="text"
                className="header-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch();
                  }
                }}
                placeholder={PLACEHOLDER_TERMS[placeholderIndex]}
              />

              {/* Action Buttons inside right of Search Bar */}
              <div style={{ position: 'absolute', right: '6px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                {!searchQuery && (
                  <span className="search-kbd-badge" title="Press Ctrl+K or / to search">
                    <span>Ctrl</span>
                    <span>K</span>
                  </span>
                )}

                {searchQuery ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                ) : null}

                {/* Clickable Search Submit Button */}
                <button
                  type="button"
                  onClick={() => handleExecuteSearch()}
                  style={{
                    background: '#e23744',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    boxShadow: '0 2px 6px rgba(226, 55, 68, 0.3)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Search catalog"
                >
                  <Search size={14} color="#ffffff" />
                </button>
              </div>
            </div>

            {/* Instant Floating Search Suggestions / Results Dropdown */}
            {searchFocused && (
              <div 
                className="header-search-dropdown"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* 1. If user typed nothing yet: Show Recent Searches, Trending Keywords & Quick Categories */}
                {!(typeof searchQuery === 'string' && searchQuery.trim().length > 0) ? (
                  <div>
                    {/* A. Recent Searches Section (like Amazon / Flipkart / Blinkit) */}
                    {Array.isArray(recentSearches) && recentSearches.length > 0 && (
                      <div style={{ marginBottom: '1.15rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          marginBottom: '0.5rem' 
                        }}>
                          <span style={{ 
                            fontSize: '0.73rem', 
                            fontWeight: 800, 
                            color: '#64748b', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.06em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <Clock size={12} color="#64748b" />
                            <span>Recent Searches</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleClearRecentSearches}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e23744',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Trash2 size={11} /> Clear all
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {recentSearches.map((term, i) => {
                            const termLabel = typeof term === 'string' ? term : (term?.label || term?.query || String(term || ''));
                            if (!termLabel) return null;
                            return (
                              <div
                                key={i}
                                className="search-recent-item"
                                onClick={() => handleExecuteSearch(termLabel)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <History size={13} color="#94a3b8" />
                                  <span style={{ fontWeight: 600 }}>{termLabel}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveRecentSearch(e, term)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '0 0 0 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    lineHeight: 1
                                  }}
                                  title="Remove from recent searches"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* B. Trending Searches in City */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '0.65rem' 
                    }}>
                      <span style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 800, 
                        color: '#64748b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Flame size={14} color="#e23744" />
                        <span>Trending Searches in <strong style={{ color: '#0f172a' }}>{city}</strong></span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Hot this week</span>
                    </div>

                    {/* Horizontal Pill Tags with Rankings & Icons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.15rem' }}>
                      {POPULAR_SEARCHES.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          className="search-trending-tag"
                          onClick={() => handleExecuteSearch(item.label)}
                        >
                          <span 
                            className="search-rank-badge" 
                            style={{ 
                              background: item.rank === 1 ? '#fee2e2' : '#f1f5f9', 
                              color: item.rank === 1 ? '#e23744' : '#64748b' 
                            }}
                          >
                            {item.rank || i + 1}
                          </span>
                          <span style={{ fontSize: '0.85rem' }}>{item.icon}</span>
                          <span>{item.label}</span>
                          {item.hot && (
                            <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>HOT</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* C. Quick Category Jump Section */}
                    <div style={{ 
                      paddingTop: '0.85rem', 
                      borderTop: '1px solid #f1f5f9' 
                    }}>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        color: '#94a3b8', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        marginBottom: '0.6rem' 
                      }}>
                        Explore Popular Categories
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        {QUICK_CATEGORIES.map((cat, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="search-quick-category-btn"
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setActiveSubCategory('All');
                              setSearchQuery('');
                              setSearchFocused(false);
                              const catalog = document.getElementById('catalog-listing-section');
                              if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            <span style={{ 
                              background: cat.color, 
                              color: cat.text, 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '8px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}>
                              {cat.icon}
                            </span>
                            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{cat.name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Browse rentals</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* D. Footer Tips Bar */}
                    <div style={{ 
                      marginTop: '0.9rem', 
                      paddingTop: '0.65rem', 
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#94a3b8'
                    }}>
                      <span>⚡ Free doorstep delivery & installation across {city}</span>
                      <span>Press <strong>Enter ↵</strong> to search • <strong>Esc</strong> to close</span>
                    </div>
                  </div>
                ) : (
                  /* 2. If user typed a search term: Show matching products */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                        Matching Products for "<strong style={{ color: '#111827' }}>{searchQuery}</strong>"
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {searchMatches.length} suggested
                      </span>
                    </div>

                    {Array.isArray(searchMatches) && searchMatches.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                        {searchMatches.map((item, idx) => {
                          if (!item) return null;
                          return (
                            <div
                              key={item.appliance_id || idx}
                              onClick={() => {
                                setSelectedProduct(item);
                                setSearchFocused(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.65rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <img 
                                  src={item.image_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=200'} 
                                  alt={item.rental_name || 'Appliance'} 
                                  style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=200';
                                  }} 
                                />
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                    {item.rental_name || 'Rental Item'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '3px' }}>
                                    <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{item.category_id || 'Appliance'}</span>
                                    {item.sub_category && <span>• {item.sub_category}</span>}
                                    <span style={{ color: (item.stock_quantity || 0) > 0 ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                                      • {(item.stock_quantity || 0) > 0 ? '🟢 In Stock' : '⚡ Express 72h'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#e23744' }}>
                                  ₹{item.monthly_price || 0}/mo
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  View <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* View all matching items in catalog button */}
                        <button
                          type="button"
                          onClick={() => handleExecuteSearch()}
                          style={{
                            marginTop: '0.4rem',
                            background: '#fff5f5',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            padding: '0.6rem',
                            color: '#e23744',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            width: '100%',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#fff5f5'; }}
                        >
                          <span>Explore all results in catalog section</span>
                          <CornerDownLeft size={13} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#64748b' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          No exact products found for "{searchQuery}"
                        </div>
                        <div style={{ fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                          Try searching for "Bed", "Sofa", "Refrigerator", or "Washing Machine".
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('All');
                            handleExecuteSearch('');
                          }}
                          style={{
                            background: '#e23744',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.45rem 1rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Browse Full Catalog
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Navigation & Action Buttons (Airbnb-Style Clean Architecture) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            {/* My Rentals Dedicated Button */}
            <Link 
              to="/rentals"
              id="header-my-rentals-btn"
              className="header-action-btn header-btn-rentals"
              style={{ 
                padding: '0.4rem 0.75rem', 
                fontSize: '0.8rem', 
                cursor: 'pointer', 
                position: 'relative', 
                zIndex: 100,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="View your active rentals, monthly payments & maintenance"
            >
              <Package size={14} color="#e23744" />
              <span>My Rentals</span>
            </Link>

            {/* Shopping Cart Button */}
            <button 
              type="button"
              id="header-cart-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/cart');
              }}
              style={{
                position: 'relative',
                color: 'var(--text-primary, #1f2937)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.45rem',
                borderRadius: '8px',
                transition: 'background 0.15s ease',
                boxSizing: 'border-box',
                zIndex: 1,
                margin: 0
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-muted, #f1f5f9)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="View Cart"
            >
              <ShoppingCart size={22} color="currentColor" />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-4px',
                  background: '#e23744',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(226, 55, 68, 0.4)'
                }}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <ThemeToggle />

            {/* Professional User Profile Avatar Dropdown */}
            <div id="user-profile-menu-container" style={{ position: 'relative', boxSizing: 'border-box' }}>
              <button
                type="button"
                id="user-profile-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '999px',
                  padding: '0.35rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  position: 'relative',
                  zIndex: 1,
                  margin: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                title="Account menu & portal access"
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: currentUserRole === 'admin' ? '#7c3aed' : currentUserRole === 'owner' ? '#059669' : '#e23744',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase'
                }}>
                  {(currentUsername || 'U').charAt(0)}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  {currentUsername || 'My Account'}
                </span>
                <ChevronDown size={13} color="#64748b" />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  boxShadow: '0 16px 36px -4px rgba(0,0,0,0.16)',
                  width: '230px',
                  zIndex: 1500,
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  {/* User Profile Header */}
                  <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827' }}>
                      {currentUsername || 'Rentora User'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                      <span style={{
                        background: currentUserRole === 'admin' ? '#f5f3ff' : currentUserRole === 'owner' ? '#ecfdf5' : '#f8fafc',
                        color: currentUserRole === 'admin' ? '#7c3aed' : currentUserRole === 'owner' ? '#059669' : '#475569',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'capitalize'
                      }}>
                        {currentUserRole}
                      </span>
                      <span>• Active Session</span>
                    </div>
                  </div>

                  {/* Customer Rentals */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/rentals');
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Package size={15} color="#e23744" />
                    <span>My Rentals & Invoices</span>
                  </button>

                  {/* KYC Verification */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/kyc');
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ShieldCheck size={15} color="#10b981" />
                    <span>Identity KYC Verification</span>
                  </button>

                  {/* Recently Viewed Shortcut */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      const sec = document.getElementById('recently-viewed-section');
                      if (sec) {
                        sec.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <History size={15} color="#0284c7" />
                    <span>Recently Viewed Items</span>
                  </button>

                  {/* Owner Portal Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleSwitchToOwner();
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Briefcase size={15} color="#059669" />
                    <span>Owner / Partner Hub</span>
                  </button>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />

                  {/* Admin Console Access (Only for Admin Role) */}
                  {currentUserRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/admin');
                      }}
                      style={{
                        padding: '0.5rem 0.65rem',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#f5f3ff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Lock size={15} color="#7c3aed" />
                      <span>Admin Control Center</span>
                    </button>
                  )}

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={15} color="#dc2626" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. SCREENSHOT 1: "EXPLORE OUR TOP CATEGORIES ──" HERO
          ======================================================== */}
      <section style={{ maxWidth: '1280px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {/* Title Header with Red Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Explore <span style={{ color: 'var(--primary-color)' }}>our Top Categories</span>
          </h1>
          <div style={{ width: '48px', height: '4px', background: 'var(--primary-color)', borderRadius: '2px', marginLeft: '0.25rem' }} />
        </div>

        {/* 2-Column Hero: Left Promo Banner + Right 4x4 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(310px, 330px) 1fr', gap: '2rem', alignItems: 'stretch' }}>
          
          {/* Left: Offset Red Promo Card */}
          <div style={{ position: 'relative', display: 'flex', minHeight: '460px' }}>
            {/* Offset red background card */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '-10px',
              width: '100%',
              height: '94%',
              background: '#e23744',
              borderRadius: '24px',
              zIndex: 1
            }} />
            
            {/* Main Lifestyle Image Card */}
            <div 
              style={{
                position: 'relative',
                zIndex: 2,
                borderRadius: '20px',
                overflow: 'hidden',
                width: '100%',
                backgroundImage: 'url("https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=900")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '1.75rem'
              }}
            >
              {/* Subtle dark gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)', zIndex: 1 }} />

              {/* Glass overlay badge button */}
              <button
                onClick={() => {
                  setSelectedCategory('Appliances');
                  setActiveSubCategory('Water Purifiers');
                  setSearchQuery('Purifier');
                  const el = document.getElementById('catalog-listing-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  background: 'rgba(18, 18, 18, 0.88)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.18)',
                  padding: '0.9rem 1.35rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e23744'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(18, 18, 18, 0.88)'; }}
              >
                <span>EXPLORE WATER PURIFIERS</span>
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          {/* Right: 4x4 Grid of 16 Category Cards (Pure, crisp isolated product icons!) */}
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              {TOP_CATEGORIES.map((cat, idx) => (
                <div
                  key={idx}
                  className="category-tile panel"
                  onClick={() => handleCategoryTileClick(cat)}
                  style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: 'var(--card-shadow)',
                    minHeight: '104px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px', marginBottom: '0.4rem' }}>
                    <CategoryIcon type={cat.name} size={44} />
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>

            {/* View More Categories Link */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  const el = document.getElementById('catalog-listing-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e23744',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View More categories <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          TRUST-FIRST RENTAL MARKETPLACE HERO BANNER
          ======================================================== */}
      <section style={{ maxWidth: '1280px', margin: '2rem auto 0', padding: '0 1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px',
          padding: '2.5rem',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)'
        }}>
          <div style={{ maxWidth: '720px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '1rem' }}>
              <ShieldCheck size={14} />
              <span>VERIFIED TRUST MARKETPLACE</span>
            </div>

            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '0 0 0.75rem', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Rent High-Value Products with <span style={{ color: '#e23744' }}>Verified Trust</span>
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Every rental is backed by <strong>multi-level verification</strong> (Email, Phone &amp; Government ID), transparent <strong>rental history &amp; reviews</strong>, <strong>refundable security deposits</strong>, and <strong>owner approval</strong> for high-value items.
            </p>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                to="/kyc"
                style={{
                  background: '#e23744',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem 1.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 24px rgba(226, 55, 68, 0.4)'
                }}
              >
                <span>Complete Trust Verification</span>
                <ArrowUpRight size={18} />
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.825rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={16} color="#4ade80" />
                  <span>Refundable Security Deposits</span>
                </div>
                <span>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={16} color="#38bdf8" />
                  <span>Owner Approval for High-Value Items</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RENTORA ASSURANCE & CORE VALUE PILLARS */}
      <AssuranceBanner />

      {/* CURATED ROOM COMBOS */}
      <CuratedRoomCombos onRentCombo={handleRentCombo} />

      {/* ========================================================
          5B. RECENTLY VIEWED APPLIANCES (Browsing History Module)
          ======================================================== */}
      <RecentlyViewedSection 
        onSelectAppliance={(app) => {
          trackApplianceView(app, 'recently_viewed_click');
          setSelectedProduct(app);
        }} 
        onAddToCart={addToCart} 
        city={city} 
      />

      {/* ========================================================
          3. SCREENSHOT 2: LISTING & FILTER EXPERIENCE
          ======================================================== */}
      <section id="catalog-listing-section" style={{ maxWidth: '1280px', margin: '4rem auto 0', padding: '0 1.5rem' }}>
        
        {/* Dual Mode Storefront Switcher: Rent vs Buy Refurbished (Rentora Dual Model) */}
        <div 
          className="store-mode-switcher panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Choose Your Shopping Mode:
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {storeMode === 'rent' 
                ? '🛋️ Renting: Flexible monthly subscription, free servicing, style swap anytime' 
                : '🏷️ Buy Certified Refurbished: Gently pre-loved items at 65% off with 1-Year Warranty & Assured Buyback'}
            </div>
          </div>

          <div style={{ display: 'flex', background: 'var(--surface-muted)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => {
                setStoreMode('rent');
                const el = document.getElementById('catalog-listing-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: storeMode === 'rent' ? 'var(--primary-color)' : 'transparent',
                color: storeMode === 'rent' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: storeMode === 'rent' ? '0 2px 8px rgba(226,55,68,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🛋️ Rent Monthly</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStoreMode('refurbished');
                const el = document.getElementById('catalog-listing-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: storeMode === 'refurbished' ? 'var(--secondary-color)' : 'transparent',
                color: storeMode === 'refurbished' ? 'var(--bg-color)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: storeMode === 'refurbished' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Award size={14} color={storeMode === 'refurbished' ? '#f59e0b' : 'var(--text-muted)'} />
              <span>🏷️ Buy Pre-Loved Refurbished</span>
              <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#111827', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>65% OFF</span>
            </button>
          </div>
        </div>

        {/* Dynamic Mode Confirmation Strip */}
        <div style={{
          background: storeMode === 'rent' ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-muted)',
          border: `1px solid ${storeMode === 'rent' ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-color)'}`,
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <span>{storeMode === 'rent' ? '🛋️' : '🏷️'}</span>
            <span>
              {storeMode === 'rent' 
                ? 'Monthly Subscription Active: Free maintenance, style upgrades, and ₹0 damage waiver included.' 
                : 'Rentora Certified Pre-Loved Store Active: Buy at 65% OFF with 1-Year Warranty & Assured Buyback.'}
            </span>
          </div>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.04em',
            padding: '0.2rem 0.6rem', 
            borderRadius: '6px', 
            background: storeMode === 'rent' ? 'var(--primary-color)' : 'var(--secondary-color)', 
            color: storeMode === 'rent' ? '#ffffff' : 'var(--bg-color)' 
          }}>
            {storeMode === 'rent' ? 'Rent Mode' : 'Buy Mode'}
          </span>
        </div>

        {/* Breadcrumb Navigation (Exact replica: Home > Appliances > Washing Machines) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.25rem'
        }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={13} />
          <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setSelectedCategory('Appliances')}>
            {selectedCategory}
          </span>
          {activeSubCategory && (
            <>
              <ChevronRight size={13} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeSubCategory}</span>
            </>
          )}
        </div>

        {/* Horizontal Main Category Filter Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          scrollbarWidth: 'none'
        }}>
          {MAIN_CATEGORIES.map((cat, idx) => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={idx}
                className="main-category-pill"
                onClick={() => {
                  setSelectedCategory(cat);
                  setActiveSubCategory(cat);
                  setSearchQuery('');
                }}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '999px',
                  border: isActive ? 'none' : '1px solid var(--border-color)',
                  background: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(226, 55, 68, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sub-Category Visual Strip (Icon Carousel with Active Red Border) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
          scrollbarWidth: 'none'
        }}>
          {SUB_CATEGORY_ICONS.map((sub, idx) => {
            const subName = String(sub?.name || '').toLowerCase();
            const subQuery = String(sub?.query || '').toLowerCase();
            const currSubCat = String(activeSubCategory || '').toLowerCase();
            const currQuery = String(searchQuery || '').toLowerCase();
            const isActive = (currSubCat === subName) || (currQuery.length > 0 && subQuery.length > 0 && currQuery.includes(subQuery));
            return (
              <div
                key={idx}
                className="sub-category-tile panel"
                onClick={() => handleSubCategoryClick(sub)}
                style={{
                  minWidth: '105px',
                  padding: '0.75rem 0.5rem',
                  borderRadius: '14px',
                  border: isActive ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: isActive ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.35rem' }}>
                  <CategoryIcon type={sub.name} size={34} />
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                  textAlign: 'center',
                  lineHeight: 1.15
                }}>
                  {sub.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* 2-Column Catalog: Left Filters Sidebar + Right 3-Col Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* ==================== LEFT FILTER SIDEBAR ==================== */}
          <aside 
            className="filters-sidebar panel"
            style={{
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              position: 'sticky',
              top: '80px',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Filters</h3>
              {(budgetFilter !== 'all' || searchQuery) && (
                <button 
                  onClick={() => { setBudgetFilter('all'); setSearchQuery(''); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Filter Section: Product Status */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                Product Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox"
                      checked={statusFilter.inStock}
                      onChange={(e) => setStatusFilter(prev => ({ ...prev, inStock: e.target.checked }))}
                      style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                    />
                    <span>In Stock</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'var(--surface-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                    {inStockCount}
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox"
                      checked={statusFilter.outOfStock}
                      onChange={(e) => setStatusFilter(prev => ({ ...prev, outOfStock: e.target.checked }))}
                      style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                    />
                    <span>Out of Stock</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'var(--surface-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                    {outOfStockCount}
                  </span>
                </label>
              </div>
            </div>

            {/* Filter Section: Monthly Budget */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                Monthly Budget
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: "All Budgets", val: "all", count: appliances.length },
                  { label: "₹0 - ₹500", val: "0-500", count: count0_500 },
                  { label: "₹501 - ₹1000", val: "501-1000", count: count501_1000 },
                  { label: "₹1001 - ₹5000", val: "1001-5000", count: count1001_5000 },
                  { label: "₹5001+", val: "5001+", count: count5001_plus }
                ].map((b, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      <input 
                        type="radio" 
                        name="budget"
                        checked={budgetFilter === b.val}
                        onChange={() => setBudgetFilter(b.val)}
                        style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                      />
                      <span>{b.label}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: 'var(--surface-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                      {b.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </aside>


          {/* ==================== RIGHT PRODUCT GRID ==================== */}
          <main>
            {/* Active Search Results Banner */}
            {searchQuery ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff5f5',
                border: '1.5px solid #fecaca',
                borderRadius: '14px',
                padding: '0.9rem 1.25rem',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 8px rgba(226, 55, 68, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: '#e23744',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Search size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
                      Showing results for "<span style={{ color: '#e23744' }}>{searchQuery}</span>"
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {filteredAppliances.length} product(s) found across all categories in {city}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setActiveSubCategory('All');
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#e23744',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  <X size={14} />
                  <span>Clear Search</span>
                </button>
              </div>
            ) : null}

            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {searchQuery ? `Search Results for "${searchQuery}"` : (activeSubCategory || selectedCategory)} on Rent in {city}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                  Showing {filteredAppliances.length} products with doorstep delivery and free servicing.
                </p>
              </div>
            </div>

            {/* 3-Column Product Cards Grid (Screenshot 2 exact style) */}
            {filteredAppliances.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                gap: '1.75rem'
              }}>
                {filteredAppliances.map((item, idx) => {
                  const isWishlisted = wishlist[item.appliance_id];
                  const isAdded = addedItems[item.appliance_id];
                  const tag = item.tag || (idx % 2 === 0 ? 'Best Seller' : 'Popular');
                  const itemStock = typeof item.stock_quantity === 'number' ? item.stock_quantity : (parseInt(item.stock_quantity, 10) || 0);
                  const isOutOfStock = itemStock <= 0;

                  return (
                    <div 
                      key={item.appliance_id || idx}
                      className="product-card panel"
                      onClick={() => {
                        trackApplianceView(item, 'catalog_click');
                        setSelectedProduct(item);
                      }}
                      style={{
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        boxShadow: 'var(--card-shadow)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      {/* Image Container with Badges */}
                      <div style={{
                        position: 'relative',
                        height: '220px',
                        background: 'var(--surface-muted)',
                        overflow: 'hidden'
                      }}>
                        {/* Best Seller / Popular Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          zIndex: 2,
                          background: tag === 'Best Seller' ? '#00a651' : '#f59e0b',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}>
                          {tag}
                        </div>

                        {/* Heart / Wishlist Button */}
                        <button
                          onClick={(e) => toggleWishlist(item.appliance_id, e)}
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            zIndex: 2,
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '50%',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 'var(--card-shadow)'
                          }}
                        >
                          <Heart 
                            size={16} 
                            color={isWishlisted ? 'var(--primary-color)' : 'var(--text-muted)'} 
                            fill={isWishlisted ? 'var(--primary-color)' : 'none'} 
                          />
                        </button>

                        {/* Product Image - Full Cover for Warm Lifestyle Look */}
                        <img 
                          src={item.image_url} 
                          alt={item.rental_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.35s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600';
                          }}
                        />

                        {/* Delivery Banner Strip (Screenshot 2 exact banner) */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'var(--surface-color)',
                          opacity: 0.95,
                          backdropFilter: 'blur(4px)',
                          borderTop: '1px solid var(--border-color)',
                          padding: '0.4rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          fontWeight: 500
                        }}>
                          <Truck size={14} color="var(--text-secondary)" />
                          <span>Delivery in 3-5 days</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1rem 1.15rem 1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: '0.4rem',
                          height: '42px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4
                        }} title={item.rental_name}>
                          {item.rental_name}
                        </div>

                        {/* Stock status indicator */}
                        <div style={{ marginBottom: '0.65rem' }}>
                          {isOutOfStock ? (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                              ● Out of Stock
                            </span>
                          ) : itemStock <= 3 ? (
                            <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                              ⚡ Only {itemStock} Left!
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                              ● In Stock ({itemStock})
                            </span>
                          )}
                        </div>

                        {/* Price & Action Row */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <div>
                            {storeMode === 'rent' ? (
                              <>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly rent</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  ₹{item.monthly_price}/mo
                                </span>
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Certified Pre-Loved</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                    ₹{Math.round(item.monthly_price * 5.2).toLocaleString('en-IN')}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                    ₹{Math.round(item.monthly_price * 5.2 * 2.8).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                trackApplianceView(item, 'quick_view');
                                setSelectedProduct(item);
                              }}
                              style={{
                                background: 'var(--surface-color)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '0.48rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease'
                              }}
                              title="Quick View specifications, reviews and tenure pricing"
                            >
                              <Eye size={13} />
                              <span>Quick View</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (storeMode === 'rent') {
                                  addToCart(item.appliance_id || item._id, "3", item);
                                } else {
                                  setSelectedProduct(item);
                                }
                              }}
                              disabled={isOutOfStock && storeMode === 'rent'}
                              style={{
                                background: isAdded
                                  ? '#16a34a'
                                  : (isOutOfStock && storeMode === 'rent')
                                    ? '#94a3b8'
                                    : storeMode === 'rent'
                                      ? 'var(--primary-color)'
                                      : 'var(--secondary-color)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.48rem 0.85rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: (isOutOfStock && storeMode === 'rent') ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                boxShadow: (isOutOfStock && storeMode === 'rent')
                                  ? 'none'
                                  : isAdded
                                    ? '0 2px 6px rgba(22, 163, 74, 0.3)'
                                    : '0 2px 6px rgba(226, 55, 68, 0.25)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={14} />
                                  <span>Added</span>
                                </>
                              ) : (isOutOfStock && storeMode === 'rent') ? (
                                'Out of Stock'
                              ) : storeMode === 'rent' ? (
                                '+ Add'
                              ) : (
                                'Buy Now'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                className="panel"
                style={{
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  boxShadow: 'var(--card-shadow)'
                }}
              >
                <Package size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No products match your criteria</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
                  Try resetting your filters or search keywords to browse our full inventory in {city}.
                </p>
                <button
                  onClick={() => { setSelectedCategory('All'); setActiveSubCategory('All'); setSearchQuery(''); setBudgetFilter('all'); }}
                  style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--primary-glow)'
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </section>

      {/* ========================================================
          4. RENT VS BUY SAVINGS CALCULATOR (Signature RentoMojo Tool)
          ======================================================== */}
      <section style={{ maxWidth: '1280px', margin: '4.5rem auto 0', padding: '0 1.5rem' }}>
        <RentVsBuyCalculator />
      </section>

      

      {/* ========================================================
          5. FLOATING "NEED HELP?" WIDGET (Screenshot 1 & 2 exact)
          ======================================================== */}
      <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 999 }}>
        <button
          onClick={() => setHelpOpen(!helpOpen)}
          style={{
            background: '#e23744',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '0.75rem 1.4rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(226, 55, 68, 0.4)',
            transition: 'transform 0.2s ease, background 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Headphones size={18} />
          <span>Need Help?</span>
        </button>

        {/* Help Popover */}
        {helpOpen && (
          <div 
            className="panel"
            style={{
              position: 'absolute',
              bottom: '60px',
              left: '0',
              width: '280px',
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--card-shadow-hover)',
              padding: '1.25rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Rentora Support</div>
              <button onClick={() => setHelpOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href="https://wa.me/" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <MessageSquare size={16} />
                <span>Chat on WhatsApp</span>
              </a>
              <a 
                href="tel:18001234567"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: '#3b82f6',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <Phone size={16} />
                <span>Call 1800-Rentora</span>
              </a>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default HomePage;
