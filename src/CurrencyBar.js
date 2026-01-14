import React from "react";
import { Box, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

// Currency bar component that displays latest currency rates
function CurrencyBar({ currencyRates, formatNumber }) {
  if (!currencyRates || currencyRates.length === 0) return null;

  // Ensure fixed order for main currencies: USD, EUR, GBP, then others
  const order = ["USD", "EUR", "GBP"];
  const sortedRates = [...currencyRates].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);

    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // Format currency values with 3 decimal places (e.g. 42.340)
  const formatFxNumber = (number) => {
    const value = Number.isFinite(number) ? number : 0;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  return (
    <Box
      sx={{
        width: "100%",
        padding: "10px 12px",
        backgroundColor: "#fff",
        borderRadius: "10px",
        border: "1px solid #d4af37",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {sortedRates.map((rate, index) => {
        const arrowColor =
          rate.arrow === "up"
            ? "#35C051"
            : rate.arrow === "down"
            ? "#e74c3c"
            : "#999";

        const priceColor =
          rate.arrow === "up"
            ? "#35C051"
            : rate.arrow === "down"
            ? "#e74c3c"
            : "#000";

        return (
          <Box
            key={index}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: "4px",
              padding: "6px 8px",
              borderRadius: "8px",
              backgroundColor: "transparent",
              transition: "background-color 0.2s ease, transform 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(212, 175, 55, 0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            {/* Top row: code and percent change */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "13px", sm: "16px", md: "18px" },
                  fontWeight: "900",
                  letterSpacing: "0.5px",
                  color: "#d4af37",
                }}
              >
                {rate.key}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: arrowColor,
                }}
              >
                {rate.arrow === "up" ? (
                  <TrendingUpIcon sx={{ fontSize: "14px" }} />
                ) : rate.arrow === "down" ? (
                  <TrendingDownIcon sx={{ fontSize: "14px" }} />
                ) : null}
                <Typography
                  sx={{
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {rate.percent}%
                </Typography>
              </Box>
            </Box>

            {/* Bottom rows: buy and sell prices (buy on top) */}
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "15px", md: "17px" },
                fontWeight: "900",
                color: priceColor,
              }}
            >
              Alış: {formatFxNumber(parseFloat(rate.buy))}
            </Typography>
            {rate.sell !== undefined && (
              <Typography
                sx={{
                  fontSize: { xs: "11px", sm: "12px", md: "13px" },
                  fontWeight: "bold",
                  color: "#666",
                }}
              >
                Satış: {formatFxNumber(parseFloat(rate.sell))}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default CurrencyBar;

