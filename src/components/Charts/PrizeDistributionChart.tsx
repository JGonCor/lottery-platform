import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// Prize distribution data
const prizeDistribution = [
  { match: '6 numbers', percentage: 40, color: '#ffc107' },
  { match: '5 numbers', percentage: 20, color: '#2196f3' },
  { match: '4 numbers', percentage: 15, color: '#4caf50' },
  { match: '3 numbers', percentage: 10, color: '#9c27b0' },
  { match: '2 numbers', percentage: 5, color: '#f44336' },
  { match: 'Platform fee', percentage: 10, color: '#607d8b' },
];

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${({ theme }) => theme.spacing.xl} 0;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const PieChartContainer = styled.div`
  width: 100%;
  max-width: 300px;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
  position: relative;
  
  @media (min-width: 768px) {
    margin: 0 ${({ theme }) => theme.spacing.xl} 0 0;
  }
`;

const Canvas = styled.canvas`
  width: 100%;
  height: auto;
`;

const CenterText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
`;

const PrizePool = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.8;
`;

const PrizePoolValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const TableContainer = styled.div`
  flex: 1;
  overflow-x: auto;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 10px ${({ theme }) => theme.colors.shadow};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
`;

const THead = styled.thead`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
  };
`;

const TH = styled.th`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: left;
  border-bottom: 2px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const TR = styled(motion.tr)`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  
  &:nth-child(even) {
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
    };
  }
  
  &:hover {
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
    };
  }
`;

const TD = styled.td`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
`;

const ColorBox = styled.div<{ color: string }>`
  width: 18px;
  height: 18px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ color }) => color};
  display: inline-block;
  margin-right: ${({ theme }) => theme.spacing.sm};
  vertical-align: middle;
`;

const PercentageBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  overflow: hidden;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const PercentageFill = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${({ width }) => `${width}%`};
  background-color: ${({ color }) => color};
`;

const PrizeDistributionChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Make sure canvas is sized properly for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Calculate total for percentages
    const total = prizeDistribution.reduce((sum, item) => sum + item.percentage, 0);
    
    let startAngle = 0;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Draw pie slices
    prizeDistribution.forEach(item => {
      const sliceAngle = (item.percentage / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      
      ctx.fillStyle = item.color;
      ctx.fill();
      
      // Add a white border between slices
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      startAngle += sliceAngle;
    });
    
    // Draw circle in center for text
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = ctx.canvas.style.backgroundColor || '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.stroke();
  }, []);

  return (
    <ChartContainer>
      <PieChartContainer>
        <Canvas ref={canvasRef} width={300} height={300} />
        <CenterText>
          <PrizePool>Prize Pool</PrizePool>
          <PrizePoolValue>100%</PrizePoolValue>
        </CenterText>
      </PieChartContainer>
      
      <TableContainer>
        <Table>
          <THead>
            <tr>
              <TH>Match</TH>
              <TH>Prize Share</TH>
              <TH>Distribution</TH>
            </tr>
          </THead>
          <tbody>
            {prizeDistribution.map((item, index) => (
              <TR 
                key={item.match}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TD>
                  <ColorBox color={item.color} />
                  {item.match}
                </TD>
                <TD>{item.percentage}%</TD>
                <TD>
                  <PercentageBar>
                    <PercentageFill width={item.percentage} color={item.color} />
                  </PercentageBar>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </ChartContainer>
  );
};

export default PrizeDistributionChart;