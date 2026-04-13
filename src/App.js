import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import {
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import CurrencyBar from "./CurrencyBar";
import { settingsService, TENANT_ID } from "./services/api";
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

  const formatNumber = (number) => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
  
  const navigate = useNavigate();
  const { isAdmin, logout, admin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
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

  // Fetch settings from API on mount
  useEffect(() => {
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
  }, []);

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

    // Listen for initial gold price when connecting
    socket.on("initialGoldPrice", (message) => {
      console.log("💰 [WS] initialGoldPrice:", message);
      setGoldPrice(message.data);
    });

    // Listen for real-time gold price updates from WebSocket
    socket.on("goldPriceUpdate", (message) => {
      console.log("💰 [WS] goldPriceUpdate:", message);
      setGoldPrice(message.data);
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
      if (message?.tenantId && message.tenantId !== TENANT_ID) {
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
  if (Array.isArray(hesaplananFiyat) && hesaplananFiyat.length > 0) {
    let start = 0;
    separatorKeys.forEach((key) => {
      const idx = hesaplananFiyat.findIndex((x) => x?.key === key);
      if (idx >= start) {
        groupedProducts.push(hesaplananFiyat.slice(start, idx + 1));
        start = idx + 1;
      }
    });
    if (start < hesaplananFiyat.length) {
      groupedProducts.push(hesaplananFiyat.slice(start));
    }
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
            {/* Left: Logo + Dernek adı */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 2 } }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/siverek-emblem.svg`}
                alt="Siverek Kuyumcular Derneği"
                sx={{
                  width: { xs: 48, sm: 56, md: 64 },
                  height: { xs: 48, sm: 56, md: 64 },
                  borderRadius: "50%",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                }}
              />
              <Box>
                {admin?.shopName && (
                  <Typography
                    sx={{
                      color: "#e6c76a",
                      fontWeight: "700",
                      fontSize: { xs: "11px", sm: "13px", md: "15px" },
                      lineHeight: 1.2,
                      letterSpacing: "0.3px",
                    }}
                  >
                    {admin.shopName}
                  </Typography>
                )}
                <Typography
                  sx={{
                    color: "#d4af37",
                    fontWeight: "900",
                    fontSize: { xs: "15px", sm: "19px", md: "24px" },
                    lineHeight: 1.2,
                    letterSpacing: "0.5px",
                    mt: admin?.shopName ? 0.3 : 0,
                  }}
                >
                  SİVEREK KUYUMCULAR DERNEĞİ
                </Typography>
              </Box>
            </Box>

            {/* Right: Tarih/saat + Çıkış */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
              <Typography sx={{ color: "#bbb", fontSize: { xs: "13px", sm: "15px", md: "17px" }, fontWeight: "bold", whiteSpace: "nowrap" }}>
                {currentTime}
              </Typography>
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

          {/* Admin-only: price & labor settings */}
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

          {/* New layout: product cards + side market panel */}
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
                GUNCEL URUN FIYATLARI
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
                              <Typography sx={{ color: "#7be08f", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(currentPrice)}
                              </Typography>
                              <Typography sx={{ color: "#ff8d7a", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(calculatedPrices[originalIndex]?.sell || item.sell)}
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
