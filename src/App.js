import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import CurrencyBar from "./CurrencyBar";

// Backend URL configuration
const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // Production URL fallback
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://apiharem.kuyumcufatih.com";
  }
  // Development URL
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

  // Helper to convert object to array if needed
  const ensureArray = (data, defaultValue) => {
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data !== null) {
      // Convert object { '0': val, '1': val, ... } to array
      return Array.from({ length: 12 }, (_, i) => data[i] || defaultValue);
    }
    return Array(12).fill(defaultValue);
  };

  const [buyLaborCosts, setBuyLaborCosts] = useState(() => {
    const saved = localStorage.getItem("buyLaborCosts");
    return saved ? ensureArray(JSON.parse(saved), "") : Array(12).fill("");
  });
  const [sellLaborCosts, setSellLaborCosts] = useState(() => {
    const saved = localStorage.getItem("sellLaborCosts");
    return saved ? ensureArray(JSON.parse(saved), "") : Array(12).fill("");
  });
  const [buyFixedCosts, setBuyFixedCosts] = useState(() => {
    const saved = localStorage.getItem("buyFixedCosts");
    const defaults = [1.0, 0.995, 0.916, 0.913, 6.38, 3.265, 6.53/4, 6.44, 3.265, 6.39/4, 0.919, 0.921];
    return saved ? ensureArray(JSON.parse(saved), 1.0) : defaults;
  });
  const [sellFixedCosts, setSellFixedCosts] = useState(() => {
    const saved = localStorage.getItem("sellFixedCosts");
    const defaults = [1.0, 0.995, 0.916, 0.913, 6.38, 3.265, 6.53/4, 6.44, 3.265, 6.39/4, 0.919, 0.921];
    return saved ? ensureArray(JSON.parse(saved), 1.0) : defaults;
  });

  const [showInputs, setShowInputs] = useState(false);
  const [calculatedPrices, setCalculatedPrices] = useState([]);
  
  // Keep track of last calculated price to avoid recalculating on every update
  const lastCalculatedPriceRef = useRef(null);

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

    socket.on("disconnect", () => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-recalculate when gold price or labor/fixed costs change
  useEffect(() => {
    if (goldPrice && goldPrice[0]) {
      // Only recalculate if price actually changed
      const currentPrice = goldPrice[0].buy;
      
      if (lastCalculatedPriceRef.current !== currentPrice) {
        console.log("🔄 Auto recalculation triggered. Old price:", lastCalculatedPriceRef.current, "New price:", currentPrice);
        lastCalculatedPriceRef.current = currentPrice;
        handleCalculatePrices();
      }
    }
  }, [goldPrice, handleCalculatePrices, buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts]);

  const handleBuyLaborCostChange = (index, value) => {
    const updatedCosts = [...buyLaborCosts];
    updatedCosts[index] = value;
    setBuyLaborCosts(updatedCosts);
  };

  const handleSellLaborCostChange = (index, value) => {
    const updatedCosts = [...sellLaborCosts];
    updatedCosts[index] = value;
    setSellLaborCosts(updatedCosts);
  };

  const handleBuyFixedCostChange = (index, value) => {
    const updatedCosts = [...buyFixedCosts];
    updatedCosts[index] = value;
    setBuyFixedCosts(updatedCosts);
  };

  const handleSellFixedCostChange = (index, value) => {
    const updatedCosts = [...sellFixedCosts];
    updatedCosts[index] = value;
    setSellFixedCosts(updatedCosts);
  };

  const handleSave = () => {
    localStorage.setItem("buyLaborCosts", JSON.stringify(buyLaborCosts));
    localStorage.setItem("sellLaborCosts", JSON.stringify(sellLaborCosts));
    localStorage.setItem("buyFixedCosts", JSON.stringify(buyFixedCosts));
    localStorage.setItem("sellFixedCosts", JSON.stringify(sellFixedCosts));
    alert("Değerler kaydedildi!");
  };

  const toggleInputs = () => {
    setShowInputs((prev) => !prev);
  };

  const removeLocalStorage = () => {
    localStorage.removeItem("buyLaborCosts");
    localStorage.removeItem("sellLaborCosts");
    localStorage.removeItem("buyFixedCosts");
    localStorage.removeItem("sellFixedCosts");
    
    // Reset state to default values
    const fixedCostDefaults = [1.0, 0.995, 0.916, 0.913, 6.38, 3.265, 6.53/4, 6.44, 3.265, 6.39/4, 0.919, 0.921];
    
    setBuyLaborCosts(Array(12).fill(""));
    setSellLaborCosts(Array(12).fill(""));
    setBuyFixedCosts(fixedCostDefaults);
    setSellFixedCosts(fixedCostDefaults);
    
    alert("Değerler silindi!");
  };

  return (
    <Box
      sx={{
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        padding: "20px",
      }}
    >

      <Box
        sx={{
          maxWidth: { xs: "100%", sm: "90%", md: "80%", lg: "75%" },
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "20px",
          padding: { xs: "0px", md: "0px" },
        }}
      >
          {/* Title and time */}
          <Box sx={{ marginBottom: "0px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: { xs: "20px", md: "100px" }, flexWrap: "wrap", gap: "10px" }}>
            <Typography
              sx={{
                color: "#d4af37",
                fontWeight: "900",
                fontSize: { xs: "18px", sm: "22px", md: "26px" },
              }}
            >
              ALTIN FİYATLARI
            </Typography>
            <Typography sx={{ color: "#999", fontSize: { xs: "12px", sm: "14px", md: "16px" }, fontWeight: "bold" }}>
              {currentTime}
            </Typography>
          </Box>

          {/* Control buttons - Icon based */}
          <Box sx={{ marginBottom: "8px", display: "flex", gap: "6px", opacity: 0.9, "&:hover": { opacity: 1 },justifyContent: "flex-end" }}>
            <IconButton
              onClick={toggleInputs}
              sx={{ 
                color: "#d4af37",
                fontSize: "20px",
                transition: "all 0.3s",
                padding: "4px",
                "&:hover": {
                  transform: "scale(1.2)",
                }
              }}
              title={showInputs ? "Gizle" : "Göster"}
            >
              {showInputs ? <VisibilityOffIcon sx={{ fontSize: "20px" }} /> : <VisibilityIcon sx={{ fontSize: "20px" }} />}
            </IconButton>
            <IconButton
              onClick={handleSave}
              sx={{ 
                color: "#d4af37",
                fontSize: "20px",
                transition: "all 0.3s",
                padding: "4px",
                "&:hover": {
                  transform: "scale(1.2)",
                }
              }}
              title="Onayla"
            >
              <SaveIcon sx={{ fontSize: "20px" }} />
            </IconButton>
            <IconButton
              onClick={removeLocalStorage}
              sx={{ 
                color: "#e74c3c",
                fontSize: "20px",
                transition: "all 0.3s",
                padding: "4px",
                "&:hover": {
                  transform: "scale(1.2)",
                }
              }}
              title="Sil"
            >
              <DeleteIcon sx={{ fontSize: "20px" }} />
            </IconButton>
          </Box>

          {/* Price table + currency bar layout */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "flex-start",
              gap: { xs: 2, md: 3 },
            }}
          >
            {/* Left: price table */}
            <Box sx={{ flex: 3, width: "100%" }}>
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderRadius: "10px",
                  overflow: showInputs ? { xs: "auto", md: "hidden" } : "hidden",
                  overflowX: showInputs ? { xs: "auto", md: "visible" } : "visible",
                  border: "1px solid #d4af37",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <Table
                  size="small"
                  sx={{ minWidth: showInputs ? { xs: "700px", md: "100%" } : "100%" }}
                >
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#333",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "15px" },
                      padding: { xs: "4px 2px", md: "8px 4px" },
                    }}
                  >
                    Ürün
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#35C051",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "15px" },
                      padding: { xs: "4px 2px", md: "8px 4px" },
                    }}
                  >
                    Alış
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#e74c3c",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "15px" },
                      padding: { xs: "4px 2px", md: "8px 4px" },
                    }}
                  >
                    Satış
                  </TableCell>
                  {showInputs && (
                    <>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color: "#333",
                          borderBottom: "2px solid #d4af37",
                          fontSize: "12px",
                        }}
                      >
                        Alış İşçilik
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color: "#333",
                          borderBottom: "2px solid #d4af37",
                          fontSize: "12px",
                        }}
                      >
                        Alış Sabit
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color: "#333",
                          borderBottom: "2px solid #d4af37",
                          fontSize: "12px",
                        }}
                      >
                        Satış İşçilik
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color: "#333",
                          borderBottom: "2px solid #d4af37",
                          fontSize: "12px",
                        }}
                      >
                        Satış Sabit
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* ONS price row - always at top */}
                {onsPrice && parseFloat(onsPrice.buy) > 0 && (
                  <TableRow
                    sx={{
                      backgroundColor: "#fff8e1",
                      borderBottom: "2px solid #d4af37",
                      "&:hover": {
                        backgroundColor: "#fff3c4",
                      },
                    }}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        color: "#d4af37",
                        fontWeight: "900",
                        borderBottom: "none",
                        padding: "4px 4px",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: "18px", fontWeight: "900", lineHeight: 1.2 }}>
                          🏆 ONS
                        </Typography>
                        <Typography sx={{ fontSize: "13px", color: "#999", fontWeight: "bold", lineHeight: 1.1 }}>
                          ALTIN (USD)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: "#35C051",
                        fontWeight: "900",
                        borderBottom: "none",
                        fontSize: "17px",
                        padding: "4px 2px",
                        lineHeight: 1.3,
                      }}
                    >
                      {formatNumber(parseFloat(onsPrice.buy))}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: "#e74c3c",
                        fontWeight: "900",
                        borderBottom: "none",
                        fontSize: "17px",
                        padding: "4px 2px",
                        lineHeight: 1.3,
                      }}
                    >
                      {formatNumber(parseFloat(onsPrice.sell))}
                    </TableCell>
                    {showInputs && (
                      <>
                        <TableCell align="right" sx={{ borderBottom: "none" }} />
                        <TableCell align="right" sx={{ borderBottom: "none" }} />
                        <TableCell align="right" sx={{ borderBottom: "none" }} />
                        <TableCell align="right" sx={{ borderBottom: "none" }} />
                      </>
                    )}
                  </TableRow>
                )}

                {hesaplananFiyat?.map((item, index) => {
                  // Use arrow value from item for trend indicator
                  const currentPrice = calculatedPrices[index]?.buy || item.buy;

                  // Add stronger separator after specific products for readability
                  const isSeparatorRow =
                    item.key === "GRAM ALTIN 913" ||
                    item.key === "ÇEYREK ESKİ" ||
                    item.key === "ÇEYREK YENİ";
                  const separatorColor = "#c0c0c0";

                  return (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "#eeeeee",
                        transition: "background-color 0.3s",
                        "&:hover": {
                          backgroundColor: index % 2 === 0 ? "#f5f5f5" : "#e5e5e5",
                        },
                        borderBottom: isSeparatorRow
                          ? `2px solid ${separatorColor}`
                          : "none",
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          color: "#d4af37",
                          fontWeight: "900",
                          borderBottom: isSeparatorRow ? "none" : "1px solid #eee",
                          padding: "4px 4px",
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: "18px", fontWeight: "900", lineHeight: 1.2 }}>
                            {item.key}
                          </Typography>
                          <Typography sx={{ fontSize: "13px", color: "#999", fontWeight: "bold", lineHeight: 1.1 }}>
                            {item.key}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#35C051",
                          fontWeight: "900",
                          borderBottom: isSeparatorRow ? "none" : "1px solid #eee",
                          fontSize: "17px",
                          padding: "4px 2px",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatNumber(currentPrice)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#e74c3c",
                          fontWeight: "900",
                          borderBottom: isSeparatorRow ? "none" : "1px solid #eee",
                          fontSize: "17px",
                          padding: "4px 2px",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatNumber(calculatedPrices[index]?.sell || item.sell)}
                      </TableCell>
                      {showInputs && (
                        <>
                          <TableCell align="right" sx={{ borderBottom: isSeparatorRow ? "none" : "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={buyLaborCosts[index] || ""}
                              onChange={(e) =>
                                handleBuyLaborCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: isSeparatorRow ? "none" : "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={buyFixedCosts[index] || ""}
                              onChange={(e) =>
                                handleBuyFixedCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: isSeparatorRow ? "none" : "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={sellLaborCosts[index] || ""}
                              onChange={(e) =>
                                handleSellLaborCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: isSeparatorRow ? "none" : "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={sellFixedCosts[index] || ""}
                              onChange={(e) =>
                                handleSellFixedCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Right: currency bar column - hidden on mobile, shown on desktop */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                flex: "0 0 auto",
                width: { md: "220px", lg: "240px" },
              }}
            >
              <CurrencyBar currencyRates={currencyRates} formatNumber={formatNumber} silverPrice={silverPrice} isMobile={false} />
            </Box>
          </Box>

          {/* Mobile: currency bar below table */}
          <Box
            sx={{
              display: { xs: "block", md: "none" },
              marginTop: 2,
            }}
          >
            <CurrencyBar currencyRates={currencyRates} formatNumber={formatNumber} silverPrice={silverPrice} isMobile={true} />
          </Box>
      </Box>
    </Box>
  );
}

export default App;
