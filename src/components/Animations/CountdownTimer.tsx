import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
  targetTime: number; // timestamp in seconds
  onComplete?: () => void;
  showTimezone?: boolean; // Show timezone information
  format24Hour?: boolean; // Force 24-hour format display
  showFrequencyBanner?: boolean; // Show lottery frequency information
  customFrequencyText?: string; // Custom frequency text
}

const TimerContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const TimeUnit = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TimeValue = styled(motion.div)`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  min-width: 80px;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
    };
    top: 50%;
  }
`;

const TimeLabel = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
`;

const TimezoneInfo = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.6;
`;

const DrawScheduleInfo = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
`;

const LotteryFrequencyBanner = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary});
  color: white;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  margin: ${({ theme }) => theme.spacing.lg} 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const FrequencyTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  font-size: 1.2rem;
  font-weight: 700;
`;

const FrequencyDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
  line-height: 1.4;
`;

const ExpiredMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.accent.orange};
  font-weight: 600;
`;

const calculateTimeLeft = (targetTime: number) => {
  const now = Math.floor(Date.now() / 1000);
  const difference = targetTime - now;
  
  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      isExpired: true
    };
  }
  
  // For 24-hour lottery intervals, ensure we show accurate time
  const days = Math.floor(difference / (60 * 60 * 24));
  const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((difference % (60 * 60)) / 60);
  const seconds = Math.floor(difference % 60);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    total: difference,
    isExpired: false
  };
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  targetTime, 
  onComplete, 
  showTimezone = true, 
  format24Hour = false,
  showFrequencyBanner = true,
  customFrequencyText
}) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetTime));
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetTime);
      setTimeLeft(newTimeLeft);
      setCurrentTime(new Date());
      
      if (newTimeLeft.total <= 0 && !newTimeLeft.isExpired) {
        clearInterval(timer);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetTime, onComplete]);
  
  // Calculate next draw time for display
  const getNextDrawTime = () => {
    const drawTime = new Date(targetTime * 1000);
    return drawTime.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: format24Hour ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !format24Hour,
      timeZoneName: 'short'
    });
  };
  
  const timeUnits = [
    { value: timeLeft.days, label: timeLeft.days === 1 ? 'Día' : 'Días' },
    { value: timeLeft.hours, label: timeLeft.hours === 1 ? 'Hora' : 'Horas' },
    { value: timeLeft.minutes, label: timeLeft.minutes === 1 ? 'Minuto' : 'Minutos' },
    { value: timeLeft.seconds, label: timeLeft.seconds === 1 ? 'Segundo' : 'Segundos' }
  ];
  
  // For 24-hour lottery, always show hours, minutes, seconds. Show days only if > 0
  const displayUnits = timeLeft.days > 0 ? timeUnits : timeUnits.slice(1);
  
  if (timeLeft.isExpired) {
    return (
      <div>
        <ExpiredMessage>
          ¡Sorteo en progreso! Recargando información...
        </ExpiredMessage>
      </div>
    );
  }
  
  return (
    <div>
      <TimerContainer>
        {displayUnits.map((unit, index) => (
          <TimeUnit key={unit.label}>
            <TimeValue
              key={`${unit.label}-${unit.value}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {unit.value.toString().padStart(2, '0')}
            </TimeValue>
            <TimeLabel>{unit.label}</TimeLabel>
          </TimeUnit>
        ))}
      </TimerContainer>
      
      {showTimezone && (
        <>
          <DrawScheduleInfo>
            Próximo sorteo: {getNextDrawTime()}
          </DrawScheduleInfo>
          <TimezoneInfo>
            Hora actual: {currentTime.toLocaleTimeString()} | 
            Sorteos cada 24 horas
          </TimezoneInfo>
        </>
      )}
      
      {showFrequencyBanner && (
        <LotteryFrequencyBanner>
          <FrequencyTitle>Sistema de Sorteos 24/7</FrequencyTitle>
          <FrequencyDescription>
            {customFrequencyText || 
             "¡Nuevas oportunidades cada día! Sorteos automáticos cada 24 horas garantizan que siempre tengas la posibilidad de ganar grandes premios."
            }
          </FrequencyDescription>
        </LotteryFrequencyBanner>
      )}
    </div>
  );
};

export default CountdownTimer;