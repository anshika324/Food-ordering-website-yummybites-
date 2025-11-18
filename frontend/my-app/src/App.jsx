import React from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Pages/Home';
import NotFound from './Pages/NotFound';
import Menu from "./Pages/Menu";
import Reservation from "./Components/Reservation";
import Success from './Pages/Success';
import './App.css'
import Cart from "./Pages/Cart";
import OrderSummary from "./Pages/OrderSummary";



const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order/:order_id" element={<OrderSummary />} /> 
          <Route path="/reservation" element={<Reservation />} />
          <Route path='/success' element={<Success/>}/>
          <Route path='*' element={<NotFound/>}/>
        </Routes>
      </Router>
      <Toaster position="top-center" reverseOrder={false} />
    </>
  )
}

export default App