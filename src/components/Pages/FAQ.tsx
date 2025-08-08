import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import { motion, AnimatePresence } from 'framer-motion';

const FAQContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const FAQCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
`;

const QuestionHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const Question = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.1rem;
`;

const ToggleIcon = styled(motion.div)`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  font-weight: bold;
`;

const AnswerContainer = styled(motion.div)`
  padding: 0 ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const Answer = styled.p`
  line-height: 1.6;
  margin: ${({ theme }) => theme.spacing.md} 0;
`;

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
}

// Componente auxiliar para manejar AnimatePresence
const AnimatePresenceWrapper = ({ children }: { children: React.ReactNode }) => (
  // @ts-ignore - Ignoramos el error de tipado en AnimatePresence
  <AnimatePresence>{children}</AnimatePresence>
);

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FAQCard>
      <QuestionHeader onClick={() => setIsOpen(!isOpen)}>
        <Question>{question}</Question>
        <ToggleIcon
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          initial={{ rotate: 0 }}
        >
          {isOpen ? '×' : '+'}
        </ToggleIcon>
      </QuestionHeader>
      
      <div>
        <AnimatePresenceWrapper>
          {isOpen && (
            <AnswerContainer
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Answer>{answer}</Answer>
            </AnswerContainer>
          )}
        </AnimatePresenceWrapper>
      </div>
    </FAQCard>
  );
};

const FAQ: React.FC = () => {
  const faqItems = [
    {
      question: "¿Qué es USDT Lottery?",
      answer: "USDT Lottery es una plataforma de lotería descentralizada que funciona en Binance Smart Chain (BSC). Los jugadores pueden comprar boletos con tokens USDT (BEP-20) para tener la oportunidad de ganar el premio mayor."
    },
    {
      question: "¿Cuánto cuesta un boleto?",
      answer: "Cada boleto cuesta 5 USDT (Tether). Puedes comprar múltiples boletos para aumentar tus posibilidades de ganar."
    },
    {
      question: "¿Cómo se selecciona al ganador?",
      answer: "Los ganadores se seleccionan utilizando Chainlink VRF (Función Aleatoria Verificable), que proporciona un número aleatorio criptográficamente seguro que no puede ser manipulado por nadie, incluidos los operadores de la lotería."
    },
    {
      question: "¿Con qué frecuencia se realizan los sorteos?",
      answer: "Los sorteos se realizan a intervalos regulares. Puedes ver el temporizador de cuenta regresiva para el próximo sorteo en la página principal."
    },
    {
      question: "¿Cuánto puedo ganar?",
      answer: "El pozo de premios consiste en el 90% de todas las ventas de boletos para esa ronda. El 10% restante va al operador de la lotería como tarifa."
    },
    {
      question: "¿Cómo sabré si he ganado?",
      answer: "Si ganas, el premio se transferirá automáticamente a la dirección de tu billetera. También puedes verificar el estado de tus boletos en la sección 'Tus Boletos'."
    },
    {
      question: "¿Necesito reclamar mi premio manualmente?",
      answer: "No, los premios se envían automáticamente a la dirección de la billetera del ganador inmediatamente después del sorteo."
    },
    {
      question: "¿Qué sucede si no se venden boletos?",
      answer: "Si no se venden boletos para un sorteo en particular, el sorteo se pospondrá hasta que se compren boletos."
    },
    {
      question: "¿Hay un límite de boletos que puedo comprar?",
      answer: "No, puedes comprar tantos boletos como quieras, siempre y cuando tengas suficiente USDT en tu billetera."
    },
    {
      question: "¿Qué blockchain utiliza la lotería?",
      answer: "La lotería funciona en Binance Smart Chain (BSC), que ofrece transacciones rápidas y tarifas bajas en comparación con otras blockchains."
    },
    {
      question: "¿El contrato de lotería está auditado?",
      answer: "El contrato inteligente de lotería está construido utilizando las mejores prácticas de la industria con la seguridad en mente. Utiliza bibliotecas establecidas como OpenZeppelin y Chainlink para funciones críticas."
    },
    {
      question: "¿Qué sucede si pierdo mis claves privadas?",
      answer: "Si pierdes acceso a tu billetera, no podemos ayudarte a recuperar tus boletos o premios. Siempre mantén tus claves privadas y frases de recuperación en un lugar seguro."
    }
  ];

  return (
    <FAQContainer>
      <PageTitle>Preguntas Frecuentes</PageTitle>
      
      {faqItems.map((item, index) => (
        <FAQItem 
          key={index} 
          question={item.question} 
          answer={item.answer} 
        />
      ))}
    </FAQContainer>
  );
};

export default FAQ;