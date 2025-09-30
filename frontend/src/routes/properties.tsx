import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PropertyList from '../pages/properties/PropertyList';
import PropertyFormPage from '../pages/properties/PropertyFormPage';
import { PropertyDetail } from '../components/properties/PropertyDetail';

const PropertyRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PropertyList />} />
      <Route path="/new" element={<PropertyFormPage />} />
      <Route path="/:id" element={<PropertyDetail />} />
      <Route path="/:id/edit" element={<PropertyFormPage />} />
    </Routes>
  );
};

export default PropertyRoutes; 