import { useCallback, useEffect, useRef } from 'react';

const getCoords = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
};

export const useSignatureCanvas = (showSignatureModal: boolean) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsSignatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const clearCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCanvasDataUrl = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return undefined;
    return canvas.toDataURL('image/png');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showSignatureModal) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const coords = getCoords(e, canvas);
      isDrawing.current = true;
      lastX = coords.x;
      lastY = coords.y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const { x, y } = getCoords(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      isDrawing.current = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [showSignatureModal]);

  const handleSettingsSignatureStartDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = settingsSignatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    isDrawing.current = true;
    const { x, y } = getCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const handleSettingsSignatureDraw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = settingsSignatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const handleSettingsSignatureStopDrawing = useCallback(() => {
    isDrawing.current = false;
    const ctx = settingsSignatureCanvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  }, []);

  return {
    canvasRef,
    settingsSignatureCanvasRef,
    clearCanvas,
    getCanvasDataUrl,
    handleSettingsSignatureStartDrawing,
    handleSettingsSignatureDraw,
    handleSettingsSignatureStopDrawing,
  };
};
