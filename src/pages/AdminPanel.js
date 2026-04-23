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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://apiharem.kuyumcufatih.com';

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
  'KORDON',
];

// Round all prices to nearest upper 1 TL
const roundTo1 = (num) => Math.ceil(num);

const DEFAULT_FIXED_COSTS = [1, 0.995, 0.916, 0.913, 6.38, 3.265, 1.6325, 6.44, 3.265, 1.5975, 0.919, 0.921, 0.920];

const AdminPanel = () => {
  const [buyLaborCosts, setBuyLaborCosts] = useState(Array(13).fill(0));
  const [sellLaborCosts, setSellLaborCosts] = useState(Array(13).fill(0));
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
  
  const { isAuthenticated, isAdmin, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

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
    
    const rawPrice = (basePrice + labor) * fixed;
    let result;
    
    result = roundTo1(rawPrice);
    
    return result.toLocaleString('tr-TR');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      if (response.success) {
        setBuyLaborCosts(response.settings.buyLaborCosts || Array(13).fill(0));
        setSellLaborCosts(response.settings.sellLaborCosts || Array(13).fill(0));
        setBuyFixedCosts(response.settings.buyFixedCosts || Array(13).fill(0));
        setSellFixedCosts(response.settings.sellFixedCosts || Array(13).fill(0));
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
    navigate('/login');
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
        background: 'linear-gradient(180deg, #2a2a2a 0%, #3a3833 100%)',
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#d4af37' }}>
            Admin Paneli
          </Typography>
          <Box>
            <IconButton onClick={() => navigate('/')} title="Ana Sayfa" sx={{ color: '#d4af37' }}>
              <HomeIcon />
            </IconButton>
            <IconButton onClick={handleLogout} title="Çıkış Yap" sx={{ color: '#ff8d7a' }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3, boxShadow: '0 10px 28px rgba(0,0,0,0.2)', background: 'linear-gradient(160deg, rgba(247,243,232,0.96) 0%, rgba(236,229,210,0.96) 100%)', border: '1px solid #b79a4c' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#8a6b22' }}>
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
                      sx={{ width: '100px', '& .MuiInputBase-input': { color: '#f5e8b0' }, '& .MuiInputLabel-root': { color: '#b9a978' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5d4a1b' } }}
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
                      sx={{ width: '100px', '& .MuiInputBase-input': { color: '#f5e8b0' }, '& .MuiInputLabel-root': { color: '#b9a978' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5d4a1b' } }}
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
            <Typography variant="body2" sx={{ mb: 3, color: '#6f6448' }}>
              Bu değerler tüm kullanıcılar için anlık olarak güncellenecektir. Fiyatlar 1 TL'ye yuvarlanır.
              {goldPrice.buy === 0 && " (Canlı fiyat bağlantısı yok - test için manuel fiyat girin)"}
            </Typography>

            <Divider sx={{ mb: 3, borderColor: '#2f2f2f' }} />

            <Grid container spacing={2}>
              {/* Desktop/tablet: dense table editor */}
              <Grid item xs={12} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e8dfc6' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #d4af37', fontWeight: 'bold' }}>
                          Ürün
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>
                          Alış İşçilik
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>
                          Alış Sabit
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#2f8f46', backgroundColor: '#dff1e2' }}>
                          Alış Fiyat
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>
                          Satış İşçilik
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>
                          Satış Sabit
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#d65c4b', backgroundColor: '#f7dfdf' }}>
                          Satış Fiyat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRODUCT_NAMES.map((name, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fbf8ef' : '#f2ead7' }}>
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

              {/* Mobile: product cards for touch-friendly editing */}
              <Grid item xs={12} sx={{ display: { xs: 'block', md: 'none' } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {PRODUCT_NAMES.map((name, index) => (
                    <Box
                      key={index}
                      sx={{
                        backgroundColor: '#f8f4e8',
                        border: '1px solid #d5c49a',
                        borderRadius: '12px',
                        p: 1.2,
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, color: '#8a6b22', mb: 0.9 }}>
                        {name}
                      </Typography>

                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Alış İşçilik"
                            type="number"
                            value={buyLaborCosts[index] || ''}
                            onChange={(e) => handleCostChange(setBuyLaborCosts, index, e.target.value)}
                            inputProps={{ step: 'any' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Alış Sabit"
                            type="number"
                            value={buyFixedCosts[index] || ''}
                            onChange={(e) => handleCostChange(setBuyFixedCosts, index, e.target.value)}
                            inputProps={{ step: 'any' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Satış İşçilik"
                            type="number"
                            value={sellLaborCosts[index] || ''}
                            onChange={(e) => handleCostChange(setSellLaborCosts, index, e.target.value)}
                            inputProps={{ step: 'any' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Satış Sabit"
                            type="number"
                            value={sellFixedCosts[index] || ''}
                            onChange={(e) => handleCostChange(setSellFixedCosts, index, e.target.value)}
                            inputProps={{ step: 'any' }}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Box sx={{ flex: 1, backgroundColor: '#e8f5e9', borderRadius: '8px', py: 0.7, textAlign: 'center' }}>
                          <Typography sx={{ color: '#2f8f46', fontWeight: 800, fontSize: '12px' }}>Alış</Typography>
                          <Typography sx={{ color: '#2f8f46', fontWeight: 900 }}>₺{calculatePrice(index, 'buy')}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, backgroundColor: '#ffebee', borderRadius: '8px', py: 0.7, textAlign: 'center' }}>
                          <Typography sx={{ color: '#d65c4b', fontWeight: 800, fontSize: '12px' }}>Satış</Typography>
                          <Typography sx={{ color: '#d65c4b', fontWeight: 900 }}>₺{calculatePrice(index, 'sell')}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
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
