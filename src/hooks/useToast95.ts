import { useState, useEffect, useCallback } from 'react';

export function useToast95() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg: string, ok: boolean = true) => {
    setMessage(msg);
    setIsError(!ok);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setVisible(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return { message, isError, visible, showToast };
}
