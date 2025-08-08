import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faFacebookF, faInstagram } from '@fortawesome/free-brands-svg-icons';

const FooterContainer = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' 
      ? theme.colors.cardBackground 
      : theme.colors.complementary.darkGreen
  };
  color: ${({ theme }) => 
    theme.mode === 'dark' 
      ? theme.colors.text 
      : theme.colors.base.white
  };
  margin-top: auto;
`;

const FooterContent = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FooterTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary};
`;

const InternalLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  transition: ${({ theme }) => theme.transition};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SocialIconsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SocialIcon = styled.a`
  color: inherit;
  font-size: 1.5rem;
  transition: ${({ theme }) => theme.transition};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    transform: scale(1.1);
  }
`;

const Copyright = styled.div`
  text-align: center;
  width: 100%;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => 
    theme.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)'
  };
`;

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterTitle>Lottery</FooterTitle>
          <p>A decentralized lottery platform on BSC. Buy tickets with USDT and win big!</p>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>Links</FooterTitle>
          <InternalLink to="/">Home</InternalLink>
          <InternalLink to="/how-to-play">How to Play</InternalLink>
          <InternalLink to="/winners">Past Winners</InternalLink>
          <InternalLink to="/faq">FAQ</InternalLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>Connect</FooterTitle>
          <SocialIconsContainer>
            <SocialIcon href="https://x.com" target="_blank" rel="noopener noreferrer" title="X">
              <FontAwesomeIcon icon={faXTwitter} />
            </SocialIcon>
            <SocialIcon href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Facebook">
              <FontAwesomeIcon icon={faFacebookF} />
            </SocialIcon>
            <SocialIcon href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram">
              <FontAwesomeIcon icon={faInstagram} />
            </SocialIcon>
          </SocialIconsContainer>
        </FooterSection>
      </FooterContent>
      
      <Copyright>
        &copy; {currentYear} Lottery. All rights reserved.
      </Copyright>
    </FooterContainer>
  );
};

export default Footer;