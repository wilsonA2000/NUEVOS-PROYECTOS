import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PaymentList } from '../components/payments/PaymentList';
import { PaymentForm } from '../components/payments/PaymentForm';

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