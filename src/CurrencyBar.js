import React from "react";
import { Box, Typography } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EuroIcon from "@mui/icons-material/Euro";
import CurrencyPoundIcon from "@mui/icons-material/CurrencyPound";
import DiamondIcon from "@mui/icons-material/Diamond";

// Currency bar component that displays latest currency rates
function CurrencyBar({ currencyRates, formatNumber, silverPrice, isMobile = false }) {
  // Ensure fixed order for main currencies: USD, EUR, GBP, then others
  const order = ["USD", "EUR", "GBP"];
  const sortedRates = currencyRates && currencyRates.length > 0
    ? [...currencyRates].sort((a, b) => {
        const ia = order.indexOf(a.key);
        const ib = order.indexOf(b.key);

        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
    : [];

  // Format currency values with 3 decimal places (e.g. 42.340)
  const formatFxNumber = (number) => {
    const value = Number.isFinite(number) ? number : 0;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  // Get icon and background color for currency
  const getCurrencyStyle = (key) => {
    switch (key) {
      case "USD":
        return {
          icon: <AttachMoneyIcon sx={{ fontSize: isMobile ? "20px" : "28px", color: "#fff" }} />,
          bgColor: "#2e7d32",
          lightBg: "rgba(46, 125, 50, 0.08)",
        };
      case "EUR":
        return {
          icon: <EuroIcon sx={{ fontSize: isMobile ? "20px" : "28px", color: "#fff" }} />,
          bgColor: "#1565c0",
          lightBg: "rgba(21, 101, 192, 0.08)",
        };
      case "GBP":
        return {
          icon: <CurrencyPoundIcon sx={{ fontSize: isMobile ? "20px" : "28px", color: "#fff" }} />,
          bgColor: "#6a1b9a",
          lightBg: "rgba(106, 27, 154, 0.08)",
        };
      default:
        return {
          icon: null,
          bgColor: "#999",
          lightBg: "rgba(153, 153, 153, 0.08)",
        };
    }
  };

  // Mobile layout: horizontal compact cards
  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Currency rates - horizontal row */}
        {sortedRates.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {sortedRates.map((rate, index) => {
              const style = getCurrencyStyle(rate.key);
              return (
                <Box
                  key={index}
                  sx={{
                    flex: "1 1 calc(33.33% - 6px)",
                    minWidth: "90px",
                    padding: "8px",
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    border: `2px solid ${style.bgColor}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Box
                    sx={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: style.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {style.icon}
                  </Box>
                  <Typography sx={{ fontSize: "13px", fontWeight: "900", color: "#333" }}>
                    {rate.key}
                  </Typography>
                  <Box sx={{ display: "flex", gap: "6px", fontSize: "11px" }}>
                    <Typography sx={{ fontWeight: "bold", color: "#35C051", fontSize: "11px" }}>
                      {formatFxNumber(parseFloat(rate.buy))}
                    </Typography>
                    <Typography sx={{ fontWeight: "bold", color: "#e74c3c", fontSize: "11px" }}>
                      {formatFxNumber(parseFloat(rate.sell))}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Silver - compact card */}
        {silverPrice && parseFloat(silverPrice.buy) > 0 && (
          <Box
            sx={{
              padding: "10px 12px",
              backgroundColor: "#fff",
              borderRadius: "10px",
              border: "2px solid #808080",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Box
              sx={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #c0c0c0 0%, #808080 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DiamondIcon sx={{ fontSize: "20px", color: "#fff" }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: "13px", fontWeight: "900", color: "#606060" }}>
                GÜMÜŞ
              </Typography>
              <Box sx={{ display: "flex", gap: "10px" }}>
                <Typography sx={{ fontSize: "14px", fontWeight: "900", color: "#35C051" }}>
                  {formatNumber(parseFloat(silverPrice.buy))}
                </Typography>
                <Typography sx={{ fontSize: "14px", fontWeight: "900", color: "#e74c3c" }}>
                  {formatNumber(parseFloat(silverPrice.sell))}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Desktop layout: vertical panel
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Currency rates panel */}
      {sortedRates.length > 0 && (
        <Box
          sx={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "2px solid #d4af37",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 2px 8px rgba(212, 175, 55, 0.15)",
          }}
        >
          <Typography
            sx={{
              fontSize: "16px",
              fontWeight: "900",
              color: "#d4af37",
              textAlign: "center",
              borderBottom: "2px solid #f0e6c8",
              paddingBottom: "8px",
              letterSpacing: "1px",
            }}
          >
            💱 DÖVİZ
          </Typography>
          {sortedRates.map((rate, index) => {
            const style = getCurrencyStyle(rate.key);
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  backgroundColor: style.lightBg,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateX(4px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  },
                }}
              >
                {/* Currency icon in colored circle */}
                <Box
                  sx={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "50%",
                    backgroundColor: style.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {style.icon}
                </Box>

                {/* Currency info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "#333",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {rate.key}
                  </Typography>
                  <Box sx={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                    <Typography
                      sx={{
                        fontSize: "15px",
                        fontWeight: "bold",
                        color: "#35C051",
                      }}
                    >
                      {formatFxNumber(parseFloat(rate.buy))}
                    </Typography>
                    {rate.sell !== undefined && (
                      <Typography
                        sx={{
                          fontSize: "15px",
                          fontWeight: "bold",
                          color: "#e74c3c",
                        }}
                      >
                        {formatFxNumber(parseFloat(rate.sell))}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Silver price panel */}
      {silverPrice && parseFloat(silverPrice.buy) > 0 && (
        <Box
          sx={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "2px solid #a0a0a0",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 2px 8px rgba(128, 128, 128, 0.15)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderBottom: "2px solid #e8e8e8",
              paddingBottom: "8px",
            }}
          >
            <DiamondIcon sx={{ fontSize: "26px", color: "#808080" }} />
            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: "900",
                color: "#606060",
                letterSpacing: "1px",
              }}
            >
              GÜMÜŞ
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "rgba(128, 128, 128, 0.06)",
            }}
          >
            {/* Silver icon in circle */}
            <Box
              sx={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #c0c0c0 0%, #808080 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              <DiamondIcon sx={{ fontSize: "26px", color: "#fff" }} />
            </Box>

            {/* Silver prices */}
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#555",
                  marginBottom: "2px",
                }}
              >
                GR / TL
              </Typography>
              <Box sx={{ display: "flex", gap: "12px" }}>
                <Typography
                  sx={{
                    fontSize: "19px",
                    fontWeight: "900",
                    color: "#35C051",
                  }}
                >
                  {formatNumber(parseFloat(silverPrice.buy))}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "19px",
                    fontWeight: "900",
                    color: "#e74c3c",
                  }}
                >
                  {formatNumber(parseFloat(silverPrice.sell))}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default CurrencyBar;
