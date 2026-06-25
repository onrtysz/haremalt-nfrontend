import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import CurrencyBar from "./CurrencyBar";
import { settingsService, getTenantId } from "./services/api";
import { useAuth } from "./context/AuthContext";

// Backend URL configuration
const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  return "https://apiharem.kuyumcufatih.com";
};

const BACKEND_URL = getBackendUrl();

function App() {
  const [hesaplananFiyat, setHesaplananFiyat] = useState(() => {
    const saved = localStorage.getItem("hesaplananFiyat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [goldPrice, setGoldPrice] = useState(null);
  const [silverPrice, setSilverPrice] = useState(() => {
    const saved = localStorage.getItem("silverPrice");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { key: "Gümüş", buy: "0", sell: "0", percent: "0", arrow: "up" };
  });
  const [onsPrice, setOnsPrice] = useState(() => {
    const saved = localStorage.getItem("onsPrice");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { key: "ONS", buy: "0", sell: "0", percent: "0", arrow: "up" };
  });
  const [currencyRates, setCurrencyRates] = useState(() => {
    const saved = localStorage.getItem("currencyRates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    // Return default values only if nothing is saved
    const defaults = [
      { key: "USD", buy: "32.50", sell: "32.80", percent: "0.00", arrow: "up" },
      { key: "EUR", buy: "35.75", sell: "36.10", percent: "0.00", arrow: "up" },
      { key: "GBP", buy: "41.20", sell: "41.60", percent: "0.00", arrow: "up" },
    ];
    return defaults;
  });
  const [currentTime, setCurrentTime] = useState("");
  const [lastDataTime, setLastDataTime] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);

  const formatNumber = (number, { decimals } = {}) => {
    const fractionDigits = decimals ?? 0;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(number);
  };

  // Helper to merge new currency rates with previous ones, preserving old values
  const mergeCurrencyRates = (previousRates, newRates) => {
    if (!Array.isArray(newRates) || newRates.length === 0) {
      return previousRates || [];
    }

    const prevArray = Array.isArray(previousRates) ? previousRates : [];
    const rateMap = new Map(prevArray.map((rate) => [rate.key, rate]));

    newRates.forEach((rate) => {
      if (!rate || !rate.key) return;

      const existing = rateMap.get(rate.key) || {};
      // Merge to keep any old fields that might not come in the new payload
      rateMap.set(rate.key, { ...existing, ...rate });
    });

    return Array.from(rateMap.values());
  };

  // Helper to convert object to array if needed (13 products)
  const ensureArray = (data, defaultValue) => {
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data !== null) {
      // Convert object { '0': val, '1': val, ... } to array
      return Array.from({ length: 13 }, (_, i) => data[i] || defaultValue);
    }
    return Array(13).fill(defaultValue);
  };

  const defaultFixedCosts = [1, 0.995, 0.916, 0.913, 6.38, 3.265, 1.6325, 6.44, 3.265, 1.5975, 0.919, 0.921, 0.920];
  
  const [buyLaborCosts, setBuyLaborCosts] = useState(Array(13).fill(0));
  const [sellLaborCosts, setSellLaborCosts] = useState(Array(13).fill(0));
  const [buyFixedCosts, setBuyFixedCosts] = useState(defaultFixedCosts);
  const [sellFixedCosts, setSellFixedCosts] = useState(defaultFixedCosts);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [calculatedPrices, setCalculatedPrices] = useState([]);
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, logout, admin, login, loading: authLoading } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
      setLoginUsername("");
      setLoginPassword("");
    } catch (err) {
      setLoginError(err.response?.data?.error || "Giriş başarısız");
    } finally {
      setLoginLoading(false);
    }
  };
  
  const handleCalculatePrices = useCallback(async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/bracelet-price`,
        {
          buyLaborCosts,
          sellLaborCosts,
          buyFixedCosts,
          sellFixedCosts,
        }
      );

      console.log("🔍 [/bracelet-price] response:", response.data);
      
      // Update all states
      const hesaplananData = response.data.hesaplanan || [];
      setHesaplananFiyat(hesaplananData);
      setCalculatedPrices(hesaplananData);
      
      // Save to localStorage
      localStorage.setItem("hesaplananFiyat", JSON.stringify(hesaplananData));
      localStorage.setItem("calculatedPrices", JSON.stringify(hesaplananData));
  
    } catch (error) {
      console.error("Error calculating prices:", error);
    }
  }, [buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts]);

  // Fetch settings from API after login
  useEffect(() => {
    if (!isAuthenticated) {
      setSettingsLoaded(false);
      return;
    }
    const fetchSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        if (response.success && response.settings) {
          const s = response.settings;
          setBuyLaborCosts(ensureArray(s.buyLaborCosts, 0));
          setSellLaborCosts(ensureArray(s.sellLaborCosts, 0));
          setBuyFixedCosts(ensureArray(s.buyFixedCosts, 1.0));
          setSellFixedCosts(ensureArray(s.sellFixedCosts, 1.0));
          setSettingsLoaded(true);
          console.log("✅ Settings loaded from API");
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, [isAuthenticated]);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Connect to WebSocket server with CORS settings
    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      upgrade: true,
    });

    socket.on("connect", () => {
      console.log("🔌 WS connected to backend:", BACKEND_URL);
    });

    socket.on("connect_error", (error) => {
      console.log("⚠️ WS connect_error:", error?.message || error);
    });

    socket.on("error", (error) => {
      console.log("⚠️ WS error:", error);
    });

    const parseLastUpdate = (str) => {
      // "24.06.2026 18:47:01" → subtract 3 hours (data comes as UTC+3 ahead)
      const [datePart, timePart] = str.split(" ");
      const [day, month, year] = datePart.split(".");
      const date = new Date(`${year}-${month}-${day}T${timePart}`);
      date.setHours(date.getHours() - 3);
      return `${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
    };

    const addPriceHistory = (data) => {
      if (!data?.[0]) return;
      const has = data[0];
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      setPriceHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].time === time) {
          const updated = [...prev];
          updated[updated.length - 1] = { time, buy: parseFloat(has.buy), sell: parseFloat(has.sell) };
          return updated;
        }
        const next = [...prev, { time, buy: parseFloat(has.buy), sell: parseFloat(has.sell) }];
        return next.length > 60 ? next.slice(-60) : next;
      });
    };

    // Listen for initial gold price when connecting
    socket.on("initialGoldPrice", (message) => {
      console.log("💰 [WS] initialGoldPrice:", message);
      setGoldPrice(message.data);
      addPriceHistory(message.data);
      if (message.data?.[0]?.last_update) {
        setLastDataTime(parseLastUpdate(message.data[0].last_update));
      }
    });

    // Listen for real-time gold price updates from WebSocket
    socket.on("goldPriceUpdate", (message) => {
      console.log("💰 [WS] goldPriceUpdate:", message);
      setGoldPrice(message.data);
      addPriceHistory(message.data);
      if (message.data?.[0]?.last_update) {
        setLastDataTime(parseLastUpdate(message.data[0].last_update));
      }
    });

    // Listen for initial silver price
    socket.on("initialSilverPrice", (message) => {
      console.log("🥈 [WS] initialSilverPrice:", message);
      if (message.data) {
        setSilverPrice(message.data);
        localStorage.setItem("silverPrice", JSON.stringify(message.data));
      }
    });

    // Listen for real-time silver price updates
    socket.on("silverPriceUpdate", (message) => {
      console.log("🥈 [WS] silverPriceUpdate:", message);
      if (message.data) {
        setSilverPrice(message.data);
        localStorage.setItem("silverPrice", JSON.stringify(message.data));
      }
    });

    // Listen for initial ONS price
    socket.on("initialOnsPrice", (message) => {
      console.log("🏆 [WS] initialOnsPrice:", message);
      if (message.data) {
        setOnsPrice(message.data);
        localStorage.setItem("onsPrice", JSON.stringify(message.data));
      }
    });

    // Listen for real-time ONS price updates
    socket.on("onsPriceUpdate", (message) => {
      console.log("🏆 [WS] onsPriceUpdate:", message);
      if (message.data) {
        setOnsPrice(message.data);
        localStorage.setItem("onsPrice", JSON.stringify(message.data));
      }
    });

    // Listen for initial currency rates
    socket.on("initialCurrencyRates", (message) => {
      // Always accept and save the data, merging with any existing values
      if (message.data) {
        setCurrencyRates((prevRates) => {
          const merged = mergeCurrencyRates(prevRates, message.data);
          localStorage.setItem("currencyRates", JSON.stringify(merged));
          return merged;
        });
      }
    });

    // Listen for real-time currency rate updates
    socket.on("currencyRatesUpdate", (message) => {
      // Merge incoming updates with previous values so missing currencies keep last price
      if (message.data) {
        setCurrencyRates((prevRates) => {
          const merged = mergeCurrencyRates(prevRates, message.data);
          localStorage.setItem("currencyRates", JSON.stringify(merged));
          return merged;
        });
      }
    });

    // Listen for settings updates from admin
    socket.on("settingsUpdate", (message) => {
      console.log("⚙️ [WS] settingsUpdate:", message);
      if (message?.tenantId && message.tenantId !== getTenantId()) {
        return;
      }
      if (message.data) {
        const s = message.data;
        setBuyLaborCosts(ensureArray(s.buyLaborCosts, 0));
        setSellLaborCosts(ensureArray(s.sellLaborCosts, 0));
        setBuyFixedCosts(ensureArray(s.buyFixedCosts, 1.0));
        setSellFixedCosts(ensureArray(s.sellFixedCosts, 1.0));
      }
    });

    socket.on("disconnect", () => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-recalculate when gold price or labor/fixed costs change (only after settings loaded)
  useEffect(() => {
    if (!settingsLoaded) return;
    
    if (goldPrice && goldPrice[0]) {
      console.log("🔄 Auto recalculation triggered due to price or settings change");
      handleCalculatePrices();
    }
  }, [goldPrice, handleCalculatePrices, buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts, settingsLoaded]);

  const goToAdminPanel = () => {
    navigate("/admin/panel");
  };

  const subtitles = {
    "HAS ALTIN 1000": "Harem 1.000",
    "HAS ALTIN 995": "Paketli 24 ayar",
    "GRAM ALTIN 916": "Paketli 22 ayar",
    "GRAM ALTIN 913": "Hurda altın",
    "ZİYNET ESKİ": "Ziynet eski",
    "YARIM ESKİ": "Yarım eski",
    "ÇEYREK ESKİ": "Çeyrek eski",
    "ZİYNET YENİ": "Ziynet yeni",
    "YARIM YENİ": "Yarım yeni",
    "ÇEYREK YENİ": "Çeyrek yeni",
    "BİLEZİK BURMA": "Ajda, çöp, burma",
    "BİLEZİK AYNALI": "Cnc",
    KORDON: "Madonna, akıtma",
  };

  const separatorKeys = ["GRAM ALTIN 913", "ÇEYREK ESKİ", "ÇEYREK YENİ"];
  const groupedProducts = [];
  const filteredProducts = Array.isArray(hesaplananFiyat) ? hesaplananFiyat.filter((x) => x?.key !== "HAS ALTIN 1000") : [];
  if (filteredProducts.length > 0) {
    let start = 0;
    separatorKeys.forEach((key) => {
      const idx = filteredProducts.findIndex((x) => x?.key === key);
      if (idx >= start) {
        groupedProducts.push(filteredProducts.slice(start, idx + 1));
        start = idx + 1;
      }
    });
    if (start < filteredProducts.length) {
      groupedProducts.push(filteredProducts.slice(start));
    }
  }

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#1a1a1a" }}>
        <CircularProgress sx={{ color: "#d4af37" }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1a1a1a 0%, #2a2518 100%)",
          padding: 2,
        }}
      >
        <Card sx={{ maxWidth: 420, width: "100%", boxShadow: "0 8px 28px rgba(0,0,0,0.45)", backgroundColor: "#171717", border: "1px solid #6f5a1f" }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/siverek-emblem.svg`}
                alt="Logo"
                sx={{ width: 64, height: 64, borderRadius: "50%", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", mb: 2 }}
              />
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #c9a227 0%, #8b6914 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <LockOutlinedIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#f0d98b" align="center">
                Kuyumcu Girişi
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "#b9a978" }} align="center">
                Canlı altın ve döviz fiyatlarını görüntülemek için giriş yapın
              </Typography>
            </Box>

            {loginError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loginError}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Kullanıcı Adı"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                margin="normal"
                required
                autoFocus
                InputLabelProps={{ sx: { color: "#b9a978" } }}
                InputProps={{ sx: { color: "#f5e8b0", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#5d4a1b" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" } } }}
              />
              <TextField
                fullWidth
                label="Şifre"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{ sx: { color: "#b9a978" } }}
                InputProps={{ sx: { color: "#f5e8b0", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#5d4a1b" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" } } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loginLoading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  backgroundColor: "#d4af37",
                  "&:hover": { backgroundColor: "#b8962e" },
                }}
              >
                {loginLoading ? <CircularProgress size={24} color="inherit" /> : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, #2a2a2a 0%, #3a3833 100%)",
        minHeight: "100vh",
        padding: { xs: "10px", sm: "14px", md: "20px" },
        boxSizing: "border-box",
      }}
    >

      <Box
        sx={{
          maxWidth: { xs: "100%", sm: "96%", md: "94%", lg: "92%", xl: "90%" },
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "20px",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: { xs: "8px", md: "16px" }, flexWrap: "wrap", gap: "8px" }}>
            {/* Left: Logo + Shop Name + Chart */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 2 }, flex: 1 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/siverek-emblem.svg`}
                alt="Altin Logo"
                sx={{
                  width: { xs: 48, sm: 56, md: 64 },
                  height: { xs: 48, sm: 56, md: 64 },
                  borderRadius: "50%",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                  flexShrink: 0,
                }}
              />
              {admin?.shopName && (
                <Typography
                  sx={{
                    color: "#f5d76e",
                    fontWeight: "900",
                    fontSize: { xs: "18px", sm: "24px", md: "30px" },
                    lineHeight: 1.1,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    textShadow: "0 2px 8px rgba(212, 175, 55, 0.4)",
                    flexShrink: 0,
                  }}
                >
                  {admin.shopName}
                </Typography>
              )}
            </Box>

            {/* Right: Tarih/saat + Çıkış */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
              {lastDataTime && (
                <Typography sx={{ color: "#e6c76a", fontSize: { xs: "14px", sm: "16px", md: "18px" }, fontWeight: "900", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  Son veri tarihi: {lastDataTime}
                </Typography>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  size="small"
                  onClick={handleLogout}
                  sx={{
                    textTransform: "none",
                    color: "#e6c76a",
                    minWidth: "auto",
                    fontSize: { xs: "10px", sm: "11px" },
                    border: "1px solid #7a6320",
                    borderRadius: "8px",
                    px: 1.5,
                    py: 0.25,
                    "&:hover": { borderColor: "#d4af37", backgroundColor: "#1b1b1b" },
                  }}
                >
                  Çıkış
                </Button>
              </Box>
            </Box>
          </Box>

          {/* HAS ALTIN 1000 Chart */}
          {priceHistory.length > 1 && (
            <Box
              sx={{
                background: "rgba(30, 30, 28, 0.85)",
                border: "1px solid #5a4a1e",
                borderRadius: "12px",
                padding: { xs: "10px 8px", md: "14px 16px" },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography sx={{ color: "#d4af37", fontWeight: 800, fontSize: { xs: "13px", md: "15px" }, letterSpacing: 0.5 }}>
                  HAS ALTIN 1000
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography sx={{ color: "#00c853", fontWeight: 900, fontSize: { xs: "14px", md: "16px" } }}>
                    A: {formatNumber(priceHistory[priceHistory.length - 1].buy, { decimals: 2 })}
                  </Typography>
                  <Typography sx={{ color: "#ff1744", fontWeight: 900, fontSize: { xs: "14px", md: "16px" } }}>
                    S: {formatNumber(priceHistory[priceHistory.length - 1].sell, { decimals: 2 })}
                  </Typography>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={priceHistory}>
                  <YAxis domain={["auto", "auto"]} hide />
                  <XAxis dataKey="time" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="buy" stroke="#00c853" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sell" stroke="#ff1744" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Admin settings button */}
          {isAdmin && (
            <Box sx={{ marginBottom: "8px", display: "flex", gap: "6px", opacity: 0.6, "&:hover": { opacity: 1 }, justifyContent: "flex-end" }}>
              <IconButton
                onClick={goToAdminPanel}
                sx={{
                  color: "#d4af37",
                  fontSize: "20px",
                  transition: "all 0.3s",
                  padding: "4px",
                  "&:hover": {
                    transform: "scale(1.2)",
                    color: "#d4af37",
                  },
                }}
                title="Fiyat ve işçilik ayarları"
              >
                <SettingsIcon sx={{ fontSize: "20px" }} />
              </IconButton>
            </Box>
          )}

          {/* Product cards + side market panel */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "2.5fr 1fr" },
              gap: { xs: 2, md: 2.5, lg: 3 },
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(160deg, rgba(247,243,232,0.96) 0%, rgba(236,229,210,0.96) 100%)",
                border: "1px solid #b79a4c",
                borderRadius: "16px",
                padding: { xs: "12px", md: 1.75 },
                boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
              }}
            >
              <Typography sx={{ color: "#8f6f20", fontWeight: 900, letterSpacing: 0.6, mb: 1.2, fontSize: { xs: "17px", md: "19px" } }}>
                GUNCEL ALTIN FIYATLARI
              </Typography>

              <Box>
                {groupedProducts.map((group, groupIndex) => (
                  <Box
                    key={groupIndex}
                    sx={{
                      mt: groupIndex === 0 ? 1 : 1.5,
                      pt: groupIndex === 0 ? 0 : 1.5,
                      borderTop: groupIndex === 0 ? "none" : "1px solid #c6af74",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
                        gap: 1,
                      }}
                    >
                      {group.map((item) => {
                        const originalIndex = hesaplananFiyat.findIndex((x) => x?.key === item.key);
                        const currentPrice = calculatedPrices[originalIndex]?.buy || item.buy;
                        return (
                          <Box
                            key={`${groupIndex}-${item.key}`}
                            sx={{
                              borderRadius: "12px",
                              border: "1px solid #d5c49a",
                              backgroundColor: "rgba(255,255,255,0.72)",
                              p: 1.1,
                              transition: "all .2s ease",
                              "&:hover": { transform: "translateY(-1px)", borderColor: "#b79a4c", backgroundColor: "rgba(255,255,255,0.95)" },
                            }}
                          >
                            <Typography sx={{ color: "#8a6b22", fontWeight: 900, fontSize: { xs: "17px", md: "18px" }, lineHeight: 1.2 }}>
                              {item.key}
                            </Typography>
                            <Typography sx={{ color: "#7d745b", fontSize: { xs: "13px", md: "14px" }, mb: 0.7 }}>
                              {subtitles[item.key] || item.key}
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#00c853", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(currentPrice, { decimals: item.key === "HAS ALTIN 1000" ? 2 : 0 })}
                              </Typography>
                              <Typography sx={{ color: "#ff1744", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(calculatedPrices[originalIndex]?.sell || item.sell, { decimals: item.key === "HAS ALTIN 1000" ? 2 : 0 })}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
              <CurrencyBar
                currencyRates={currencyRates}
                formatNumber={formatNumber}
                silverPrice={silverPrice}
                onsPrice={onsPrice}
                isMobile={false}
              />
            </Box>
          </Box>

      </Box>
    </Box>
  );
}

export default App;
