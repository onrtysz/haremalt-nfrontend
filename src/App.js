import React, { useState, useEffect, useCallback } from "react";
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
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

// Backend URL configuration
const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // Production URL fallback
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://haremaltinbackend.onrender.com";
  }
  // Development URL
  return "http://localhost:4002";
};

const BACKEND_URL = getBackendUrl();

function App() {
  const [hesaplananFiyat, setHesaplananFiyat] = useState([]);
  const [goldPrice, setGoldPrice] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  
  const formatNumber = (number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };
  
  // Helper to convert object to array if needed
  const ensureArray = (data, defaultValue) => {
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data !== null) {
      // Convert object { '0': val, '1': val, ... } to array
      return Array.from({ length: 10 }, (_, i) => data[i] || defaultValue);
    }
    return Array(10).fill(defaultValue);
  };

  const [buyLaborCosts, setBuyLaborCosts] = useState(() => {
    const saved = localStorage.getItem("buyLaborCosts");
    return saved ? ensureArray(JSON.parse(saved), "") : Array(10).fill("");
  });
  const [sellLaborCosts, setSellLaborCosts] = useState(() => {
    const saved = localStorage.getItem("sellLaborCosts");
    return saved ? ensureArray(JSON.parse(saved), "") : Array(10).fill("");
  });
  const [buyFixedCosts, setBuyFixedCosts] = useState(() => {
    const saved = localStorage.getItem("buyFixedCosts");
    const defaults = [1.0, 0.995, 0.916, 0.913, 6.38, 6.44, 6.53/4, 6.39/4, 0.919, 0.921];
    return saved ? ensureArray(JSON.parse(saved), 1.0) : defaults;
  });
  const [sellFixedCosts, setSellFixedCosts] = useState(() => {
    const saved = localStorage.getItem("sellFixedCosts");
    const defaults = [1.0, 0.995, 0.916, 0.913, 6.38, 6.44, 6.53/4, 6.39/4, 0.919, 0.921];
    return saved ? ensureArray(JSON.parse(saved), 1.0) : defaults;
  });

  const [showInputs, setShowInputs] = useState(false);
  const [calculatedPrices, setCalculatedPrices] = useState([]);
  const [cellColors, setCellColors] = useState({});

  const setCellColor = (index, color) => {
    setCellColors((prevColors) => ({ ...prevColors, [index]: color }));

    setTimeout(() => {
      setCellColors((prevColors) => ({ ...prevColors, [index]: "transparent" }));
    }, 5000);
  };

  const handleCalculatePrices = useCallback(async () => {
    console.log("🔄 handleCalculatePrices called");
    try {
      console.log("📍 Sending to backend:", { buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts });
      
      const response = await axios.post(
        `${BACKEND_URL}/bracelet-price`,
        {
          buyLaborCosts,
          sellLaborCosts,
          buyFixedCosts,
          sellFixedCosts,
        }
      );
      
      console.log("✅ Response received:", response.data);
      
      // Tüm state'leri güncelle
      setHesaplananFiyat(response.data.hesaplanan || []);
      setCalculatedPrices(response.data.hesaplanan || []);
  
      // Renk değişimlerini uygula
      if (response.data.hesaplanan) {
        response.data.hesaplanan.forEach((item, index) => {
          if (item.arrow === "up") {
            setCellColor(index, "#35C051");
          } else if (item.arrow === "down") {
            setCellColor(index, "red");
          }
        });
      }
  
      console.log("✅ Hesaplamalar güncellendi:", response.data.hesaplanan);
    } catch (error) {
      console.error("❌ Hesaplama hatası:", error.message);
      console.error("Full error:", error);
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
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    socket.on("connect", () => {
      console.log("✅ Connected to real-time price updates");
    });

    // Listen for initial gold price when connecting
    socket.on("initialGoldPrice", (message) => {
      console.log("📊 Initial price received:", message.data);
      setGoldPrice(message.data);
    });

    // Listen for real-time gold price updates from WebSocket
    socket.on("goldPriceUpdate", (message) => {
      console.log("📊 Real-time price update received:", message.data);
      setGoldPrice(message.data);
      console.log("New price set:", message.data[0].buy, message.data[0].sell);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from price updates");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-recalculate when gold price or labor/fixed costs change
  useEffect(() => {
    if (goldPrice) {
      handleCalculatePrices();
    }
  }, [goldPrice, handleCalculatePrices, buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts]);

  const handleBuyLaborCostChange = (index, value) => {
    const updatedCosts = [...buyLaborCosts];
    updatedCosts[index] = value;
    setBuyLaborCosts(updatedCosts);
    console.log("Buy labor updated:", updatedCosts);
  };

  const handleSellLaborCostChange = (index, value) => {
    const updatedCosts = [...sellLaborCosts];
    updatedCosts[index] = value;
    setSellLaborCosts(updatedCosts);
    console.log("Sell labor updated:", updatedCosts);
  };

  const handleBuyFixedCostChange = (index, value) => {
    const updatedCosts = [...buyFixedCosts];
    updatedCosts[index] = value;
    setBuyFixedCosts(updatedCosts);
    console.log("Buy fixed updated:", updatedCosts);
  };

  const handleSellFixedCostChange = (index, value) => {
    const updatedCosts = [...sellFixedCosts];
    updatedCosts[index] = value;
    setSellFixedCosts(updatedCosts);
    console.log("Sell fixed updated:", updatedCosts);
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
    const fixedCostDefaults = [1.0, 0.995, 0.916, 0.913, 6.38, 6.44, 6.53/4, 6.39/4, 0.919, 0.921];
    
    setBuyLaborCosts(Array(10).fill(""));
    setSellLaborCosts(Array(10).fill(""));
    setBuyFixedCosts(fixedCostDefaults);
    setSellFixedCosts(fixedCostDefaults);
    
    alert("Değerler silindi!");
  };

  

  // useEffect(() => {
  //   handleCalculatePrices();
  // }, [buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts]);


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
          maxWidth: { xs: "100%", sm: "80%", md: "60%", lg: "50%" },
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

          {/* Price table */}
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
            <Table sx={{ minWidth: showInputs ? { xs: "700px", md: "100%" } : "100%" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#333",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "16px" },
                      padding: { xs: "6px 2px", md: "10px 4px" },
                    }}
                  >
                    Ürün
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#333",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "16px" },
                      padding: { xs: "6px 2px", md: "10px 4px" },
                    }}
                  >
                    Alış
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#333",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "16px" },
                      padding: { xs: "6px 2px", md: "10px 4px" },
                    }}
                  >
                    Satış
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "900",
                      color: "#333",
                      borderBottom: "3px solid #d4af37",
                      fontSize: { xs: "11px", sm: "13px", md: "16px" },
                      padding: { xs: "6px 2px", md: "10px 4px" },
                    }}
                  >
                    Fark (%)
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
                {hesaplananFiyat?.map((item, index) => {
                  // Note: percentChange calculation uses initial price from item for baseline
                  const currentPrice = calculatedPrices[index]?.buy || item.buy;
                  const percentChange = 0; // Baseline comparison - will be enhanced with historical data

                  return (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor:
                          cellColors[index] === "#35C051"
                            ? "#e8f5e9"
                            : cellColors[index] === "red"
                            ? "#ffebee"
                            : index % 2 === 0 ? "#ffffff" : "#eeeeee",
                        transition: "background-color 0.3s",
                        "&:hover": {
                          backgroundColor: index % 2 === 0 ? "#f5f5f5" : "#e5e5e5",
                        },
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          color: "#d4af37",
                          fontWeight: "900",
                          borderBottom: "1px solid #eee",
                          padding: "6px 4px",
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
                          color: "#000",
                          fontWeight: "900",
                          borderBottom: "1px solid #eee",
                          fontSize: "18px",
                          padding: "6px 2px",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatNumber(currentPrice)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#000",
                          fontWeight: "900",
                          borderBottom: "1px solid #eee",
                          fontSize: "18px",
                          padding: "6px 2px",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatNumber(calculatedPrices[index]?.sell || item.sell)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "3px",
                          padding: "6px 4px",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            color:
                              percentChange >= 0
                                ? "#35C051"
                                : "#e74c3c",
                          }}
                        >
                          {percentChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: "18px" }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: "18px" }} />
                          )}
                          <Typography sx={{ fontSize: "16px", fontWeight: "900", lineHeight: 1.2 }}>
                            {Math.abs(percentChange).toFixed(2)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      {showInputs && (
                        <>
                          <TableCell align="right" sx={{ borderBottom: "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={buyLaborCosts[index] || ""}
                              onChange={(e) =>
                                handleBuyLaborCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={buyFixedCosts[index] || ""}
                              onChange={(e) =>
                                handleBuyFixedCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: "1px solid #eee" }}>
                            <TextField
                              size="small"
                              value={sellLaborCosts[index] || ""}
                              onChange={(e) =>
                                handleSellLaborCostChange(index, e.target.value)
                              }
                              sx={{ width: "90px" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: "1px solid #eee" }}>
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
    </Box>
  );
}

export default App;
