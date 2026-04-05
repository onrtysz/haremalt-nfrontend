import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
  Snackbar,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/api';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4002'
  : 'https://apiharem.kuyumcufatih.com';

const PRODUCT_NAMES = [
  'HAS ALTIN 1000',
  'HAS ALTIN 995',
  'GRAM ALTIN 916',
  'GRAM ALTIN 913',
  'ZİYNET ESKİ',
  'YARIM ESKİ',
  'ÇEYREK ESKİ',
  'ZİYNET YENİ',
  'YARIM YENİ',
  'ÇEYREK YENİ',
  'BİLEZİK BURMA',
  'BİLEZİK AYNALI',
];

const roundTo25 = (num) => Math.ceil(num / 25) * 25;

const DEFAULT_FIXED_COSTS = [1, 0.995, 0.916, 0.913, 6.38, 3.265, 1.6325, 6.44, 3.265, 1.5975, 0.919, 0.921];

const AdminPanel = () => {
  const [buyLaborCosts, setBuyLaborCosts] = useState(Array(12).fill(0));
  const [sellLaborCosts, setSellLaborCosts] = useState(Array(12).fill(0));
  const [buyFixedCosts, setBuyFixedCosts] = useState([...DEFAULT_FIXED_COSTS]);
  const [sellFixedCosts, setSellFixedCosts] = useState([...DEFAULT_FIXED_COSTS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [goldPrice, setGoldPrice] = useState({ buy: 0, sell: 0 });
  const [manualGoldPrice, setManualGoldPrice] = useState({ buy: '', sell: '' });
  const [useManualPrice, setUseManualPrice] = useState(false);
  
  const { isAuthenticated, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('initialGoldPrice', (message) => {
      if (message.data && message.data[0]) {
        setGoldPrice({
          buy: parseFloat(message.data[0].buy) || 0,
          sell: parseFloat(message.data[0].sell) || 0,
        });
      }
    });

    socket.on('goldPriceUpdate', (message) => {
      if (message.data && message.data[0]) {
        setGoldPrice({
          buy: parseFloat(message.data[0].buy) || 0,
          sell: parseFloat(message.data[0].sell) || 0,
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  const getActiveGoldPrice = () => {
    if (useManualPrice && (manualGoldPrice.buy || manualGoldPrice.sell)) {
      return {
        buy: parseFloat(manualGoldPrice.buy) || 0,
        sell: parseFloat(manualGoldPrice.sell) || 0,
      };
    }
    return goldPrice;
  };

  const calculatePrice = (index, type) => {
    const activePrice = getActiveGoldPrice();
    const basePrice = type === 'buy' ? activePrice.buy : activePrice.sell;
    const labor = type === 'buy' ? (buyLaborCosts[index] || 0) : (sellLaborCosts[index] || 0);
    const fixed = type === 'buy' ? (buyFixedCosts[index] || 1) : (sellFixedCosts[index] || 1);
    
    if (basePrice === 0) return '-';
    const result = roundTo25((basePrice + labor) * fixed);
    return result.toLocaleString('tr-TR');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      if (response.success) {
        setBuyLaborCosts(response.settings.buyLaborCosts || Array(12).fill(0));
        setSellLaborCosts(response.settings.sellLaborCosts || Array(12).fill(0));
        setBuyFixedCosts(response.settings.buyFixedCosts || Array(12).fill(0));
        setSellFixedCosts(response.settings.sellFixedCosts || Array(12).fill(0));
      }
    } catch (err) {
      setError('Ayarlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await settingsService.updateSettings({
        buyLaborCosts: buyLaborCosts.map(Number),
        sellLaborCosts: sellLaborCosts.map(Number),
        buyFixedCosts: buyFixedCosts.map(Number),
        sellFixedCosts: sellFixedCosts.map(Number),
      });
      
      if (response.success) {
        setSuccess('Ayarlar başarıyla kaydedildi!');
        setSnackbarOpen(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const handleCostChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = value === '' ? 0 : parseFloat(value) || 0;
      return updated;
    });
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#d4af37' }}>
            Admin Paneli
          </Typography>
          <Box>
            <IconButton onClick={() => navigate('/')} title="Ana Sayfa">
              <HomeIcon />
            </IconButton>
            <IconButton onClick={handleLogout} title="Çıkış Yap" color="error">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#333' }}>
                İşçilik ve Sabit Maliyet Ayarları
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {goldPrice.buy > 0 ? (
                  <Chip 
                    label={`Canlı: ₺${goldPrice.buy.toLocaleString('tr-TR')} / ₺${goldPrice.sell.toLocaleString('tr-TR')}`}
                    color="success"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <>
                    <TextField
                      size="small"
                      label="Alış"
                      type="number"
                      value={manualGoldPrice.buy}
                      onChange={(e) => {
                        setManualGoldPrice(prev => ({ ...prev, buy: e.target.value }));
                        setUseManualPrice(true);
                      }}
                      sx={{ width: '100px' }}
                      placeholder="6800"
                    />
                    <TextField
                      size="small"
                      label="Satış"
                      type="number"
                      value={manualGoldPrice.sell}
                      onChange={(e) => {
                        setManualGoldPrice(prev => ({ ...prev, sell: e.target.value }));
                        setUseManualPrice(true);
                      }}
                      sx={{ width: '100px' }}
                      placeholder="6850"
                    />
                    <Chip 
                      label="Test Fiyatı"
                      color="warning"
                      size="small"
                    />
                  </>
                )}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bu değerler tüm kullanıcılar için anlık olarak güncellenecektir. Fiyatlar 25'in katlarına yuvarlanır.
              {goldPrice.buy === 0 && " (Canlı fiyat bağlantısı yok - test için manuel fiyat girin)"}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9f9f9' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #d4af37', fontWeight: 'bold' }}>
                          Ürün
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>
                          Alış İşçilik
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>
                          Alış Sabit
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051', backgroundColor: '#e8f5e9' }}>
                          Alış Fiyat
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>
                          Satış İşçilik
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>
                          Satış Sabit
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c', backgroundColor: '#ffebee' }}>
                          Satış Fiyat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRODUCT_NAMES.map((name, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px', fontWeight: '600', color: '#d4af37' }}>
                            {name}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              type="number"
                              value={buyLaborCosts[index] || ''}
                              onChange={(e) => handleCostChange(setBuyLaborCosts, index, e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ step: 'any' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              type="number"
                              value={buyFixedCosts[index] || ''}
                              onChange={(e) => handleCostChange(setBuyFixedCosts, index, e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ step: 'any' }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e8f5e9', fontWeight: 'bold', color: '#35C051' }}>
                            ₺{calculatePrice(index, 'buy')}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              type="number"
                              value={sellLaborCosts[index] || ''}
                              onChange={(e) => handleCostChange(setSellLaborCosts, index, e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ step: 'any' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              type="number"
                              value={sellFixedCosts[index] || ''}
                              onChange={(e) => handleCostChange(setSellFixedCosts, index, e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ step: 'any' }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#ffebee', fontWeight: 'bold', color: '#e74c3c' }}>
                            ₺{calculatePrice(index, 'sell')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: '#d4af37',
                  '&:hover': {
                    backgroundColor: '#b8962e',
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={success}
      />
    </Box>
  );
};

export default AdminPanel;
