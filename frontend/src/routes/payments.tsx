import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PaymentList from '../pages/payments/PaymentList';
import PaymentForm from '../pages/payments/PaymentForm';

const PaymentRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PaymentList />} />
      <Route path="/new" element={<PaymentForm />} />
      <Route path="/:id/edit" element={<PaymentForm />} />
    </Routes>
  );
};

export default PaymentRoutes; 