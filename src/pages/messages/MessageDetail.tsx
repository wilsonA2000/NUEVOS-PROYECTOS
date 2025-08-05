import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const MessageDetail: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = useCallback(() => {
    navigate('/app/messages');
  }, [navigate]);

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  );
};

export default MessageDetail; 