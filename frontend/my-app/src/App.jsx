// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Home           from './Pages/Home';
import NotFound       from './Pages/NotFound';
import Menu           from './Pages/Menu';
import Cart           from './Pages/Cart';
import OrderSummary   from './Pages/OrderSummary';
import OrderHistory   from './Pages/OrderHistory';
import AdminDashboard from './Pages/AdminDashboard';
import Success        from './Pages/Success';
import Reservation    from './Components/Reservation';

import './App.css';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          {/* ✅ Toaster INSIDE Router so all toast() calls from any page/component work */}
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 3000,
              style: { fontFamily: 'Oswald, sans-serif', fontSize: '15px' },
              success: { iconTheme: { primary: '#0fe312ff', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path='/'                element={<Home />} />
            <Route path='/menu'            element={<Menu />} />
            <Route path='/cart'            element={<Cart />} />
            <Route path='/order/:order_id' element={<OrderSummary />} />
            <Route path='/order-history'   element={<OrderHistory />} />
            <Route path='/admin'           element={<AdminDashboard />} />
            <Route path='/reservation'     element={<Reservation />} />
            <Route path='/success'         element={<Success />} />
            <Route path='*'               element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;