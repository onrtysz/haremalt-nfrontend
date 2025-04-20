import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
} from "@mui/material";

function App() {
  const [prices, setPrices] = useState([]);
  const [hesaplananFiyat, setHesaplananFiyat] = useState([]);
  const [goldPrice, setGoldPrice] = useState(null);
  
  const formatNumber = (number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };
  
  const [buyLaborCosts, setBuyLaborCosts] = useState(() => {
    const saved = localStorage.getItem("buyLaborCosts");
    return saved ? JSON.parse(saved) : {};
  });
  const [sellLaborCosts, setSellLaborCosts] = useState(() => {
    const saved = localStorage.getItem("sellLaborCosts");
    return saved ? JSON.parse(saved) : {};
  });
  const [buyFixedCosts, setBuyFixedCosts] = useState(() => {
    const saved = localStorage.getItem("buyFixedCosts");
    return saved ? JSON.parse(saved) : {};
  });
  const [sellFixedCosts, setSellFixedCosts] = useState(() => {
    const saved = localStorage.getItem("sellFixedCosts");
    return saved ? JSON.parse(saved) : {};
  });

  const [showInputs, setShowInputs] = useState(false);
  const [calculatedPrices, setCalculatedPrices] = useState([]);
  const [cellColors, setCellColors] = useState({});


 
  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const response = await axios.get("https://haremaltinbackend.onrender.com/gold-price");
        setGoldPrice(response.data);
        await handleCalculatePrices();
      } catch (error) {
        console.error("Bir hata oluştu:", error);
      }
    };

    fetchGoldPrice();

    const interval = setInterval(() => {
      fetchGoldPrice();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleCalculatePrices = async () => {
    try {
      const response = await axios.post(
        "https://haremaltinbackend.onrender.com/bracelet-price",
        {
          buyLaborCosts,
          sellLaborCosts,
          buyFixedCosts,
          sellFixedCosts,
        }
      );
  
      // Tüm state'leri güncelle
      setPrices(response.data.price || []);
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
  
      console.log("Hesaplamalar güncellendi:", response.data.hesaplanan);
    } catch (error) {
      console.error("Hesaplama hatası:", error);
    }
  };

  const setCellColor = (index, color) => {
    setCellColors((prevColors) => ({ ...prevColors, [index]: color }));

    setTimeout(() => {
      setCellColors((prevColors) => ({ ...prevColors, [index]: "transparent" }));
    }, 5000);
  };

  const handleBuyLaborCostChange = (index, value) => {
    const updatedCosts = { ...buyLaborCosts, [index]: value };
    setBuyLaborCosts(updatedCosts);
  };

  const handleSellLaborCostChange = (index, value) => {
    const updatedCosts = { ...sellLaborCosts, [index]: value };
    setSellLaborCosts(updatedCosts);
  };

  const handleBuyFixedCostChange = (index, value) => {
    const updatedCosts = { ...buyFixedCosts, [index]: value };
    setBuyFixedCosts(updatedCosts);
  };

  const handleSellFixedCostChange = (index, value) => {
    const updatedCosts = { ...sellFixedCosts, [index]: value };
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
    alert("Değerler silindi!");
  };

  

  // useEffect(() => {
  //   handleCalculatePrices();
  // }, [buyLaborCosts, sellLaborCosts, buyFixedCosts, sellFixedCosts]);

  return (
    <div style={{ padding: "20px", backgroundColor: "#181818", color: "#fff" }}>
      <h1 style={{ color: "#b7a369", textAlign: "center" }}>Altın Fiyatları</h1>
      <div style={{ textAlign: "right", marginBottom: "20px" }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={toggleInputs}
          style={{ marginBottom: "20px", marginRight: "20px" }}
        >
          {showInputs ? "Gizle" : "Göster"}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSave}
          style={{ marginBottom: "20px" }}
        >
          Onayla
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={removeLocalStorage}
          style={{ marginBottom: "20px", marginLeft: "20px" }}
        >
          Sil
        </Button>
      </div>

      <TableContainer component={Paper} style={{ backgroundColor: "#181818" }}>
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: "#2C2C2C", color: "#fff" }}>
              <TableCell style={{ color: "#fff", fontWeight: "bold" }}>
              </TableCell>
              <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                Alış
              </TableCell>
              <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                Satış
              </TableCell>
              {showInputs && (
                <>
                  <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                    Buy Labor Cost
                  </TableCell>
                  <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                    Buy Fixed Cost
                  </TableCell>
                  <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                    Sell Labor Cost
                  </TableCell>
                  <TableCell align="right" style={{ color: "#fff", fontWeight: "bold" }}>
                    Sell Fixed Cost
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {hesaplananFiyat?.map((item, index) => (
              <TableRow key={index} style={{ borderBottom: "1px solid #444" }}>
                <TableCell style={{ color: "#b7a369", padding: "12px" }}>{item.key}</TableCell>
                <TableCell
                  align="right"
                  style={{
                    backgroundColor: cellColors[index] || "transparent",
                    transition: "background-color 0.5s",
                    color: "#fff",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {formatNumber(calculatedPrices[index]?.buy) || formatNumber(item.buy)}
                </TableCell>
                <TableCell
                  align="right"
                  style={{
                    backgroundColor: cellColors[index] || "transparent",
                    transition: "background-color 0.5s",
                    color: "#fff",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {formatNumber(calculatedPrices[index]?.sell) || formatNumber(item.sell)}
                </TableCell>
                {showInputs && (
                  <>
                    <TableCell align="right">
                      <TextField
                        value={buyLaborCosts[index]}
                        onChange={(e) => handleBuyLaborCostChange(index, e.target.value)}
                        style={{ width: "120px", backgroundColor: "#333", color: "#fff" , 
                          border: "1px solid #fff", borderRadius: "5px"
                        }}
                        InputProps={{
                          style: {
                            color: "#fff", // Metin rengi
                          },
                        }}
                        InputLabelProps={{
                          style: {
                            color: "#fff", // Label rengi
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={buyFixedCosts[index]}
                        onChange={(e) => handleBuyFixedCostChange(index, e.target.value)}
                        style={{ width: "120px", backgroundColor: "#333", color: "#fff" , 
                          border: "1px solid #fff", borderRadius: "5px"
                        }}
                        InputProps={{
                          style: {
                            color: "#fff", // Metin rengi
                          },
                        }}
                        InputLabelProps={{
                          style: {
                            color: "#fff", // Label rengi
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={sellLaborCosts[index]}
                        onChange={(e) => handleSellLaborCostChange(index, e.target.value)}
                        style={{ width: "120px", backgroundColor: "#333", color: "#fff" , 
                          border: "1px solid #fff", borderRadius: "5px"
                        }}
                        InputProps={{
                          style: {
                            color: "#fff", // Metin rengi
                          },
                        }}
                        InputLabelProps={{
                          style: {
                            color: "#fff", // Label rengi
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        value={sellFixedCosts[index]}
                        onChange={(e) => handleSellFixedCostChange(index, e.target.value)}
                        style={{ width: "120px", backgroundColor: "#333", color: "#fff" , 
                          border: "1px solid #fff", borderRadius: "5px"
                        }}
                        InputProps={{
                          style: {
                            color: "#fff", // Metin rengi
                          },
                        }}
                        InputLabelProps={{
                          style: {
                            color: "#fff", // Label rengi
                          },
                        }}
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default App;
