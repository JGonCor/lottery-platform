import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  prefix?: string;
  suffix?: string;
}

const CounterContainer = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  overflow: hidden;
`;

const Digit = styled(motion.span)`
  display: inline-block;
  min-width: 1ch;
  text-align: center;
`;

const AnimatePresenceWrapper = ({ children }: { children: React.ReactNode }) => (
  // @ts-ignore - Ignoramos el error de tipado en AnimatePresence
  <AnimatePresence mode="popLayout">{children}</AnimatePresence>
);

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1.5,
  formatter = (val) => val.toLocaleString(),
  prefix = '',
  suffix = '',
}) => {
  const prevValueRef = useRef<number>(0);
  const controls = useAnimation();
  
  useEffect(() => {
    const animateCounter = async () => {
      await controls.start({
        scale: [1, 1.1, 1],
        color: ['inherit', '#ffc107', 'inherit'],
        transition: { duration: 0.3 }
      });
    };
    
    if (value !== prevValueRef.current) {
      animateCounter();
      prevValueRef.current = value;
    }
  }, [value, controls]);
  
  const formattedValue = formatter(value);
  
  return (
    <CounterContainer animate={controls}>
      {prefix && <span>{prefix}</span>}
      <div>
        <AnimatePresenceWrapper>
          {formattedValue.split('').map((digit, i) => (
            <Digit
              key={`${i}-${digit}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              {digit}
            </Digit>
          ))}
        </AnimatePresenceWrapper>
      </div>
      {suffix && <span>{suffix}</span>}
    </CounterContainer>
  );
};

export default AnimatedCounter;