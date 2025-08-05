import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PropertyList from '../pages/properties/PropertyList';
import PropertyForm from '../pages/properties/PropertyForm';
import { PropertyDetail } from '../components/properties/PropertyDetail';

const PropertyRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PropertyList />} />
      <Route path="/new" element={<PropertyForm />} />
      <Route path="/:id" element={<PropertyDetail />} />
      <Route path="/:id/edit" element={<PropertyForm />} />
    </Routes>
  );
};

export default PropertyRoutes; 