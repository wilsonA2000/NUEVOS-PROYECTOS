import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ContractList from '../pages/contracts/ContractList';
import ContractForm from '../pages/contracts/ContractForm';

const ContractRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ContractList />} />
      <Route path="/new" element={<ContractForm />} />
      <Route path="/:id/edit" element={<ContractForm />} />
    </Routes>
  );
};

export default ContractRoutes; 