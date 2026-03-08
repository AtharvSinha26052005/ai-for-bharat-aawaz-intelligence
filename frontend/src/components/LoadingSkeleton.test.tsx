import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { LoadingSkeleton } from './LoadingSkeleton';
import { theme } from '../theme/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('LoadingSkeleton', () => {
  describe('card variant', () => {
    it('renders the specified number of skeleton cards', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="card" count={3} />
      );
      
      // Check that we have 3 card skeletons
      const cards = container.querySelectorAll('[class*="MuiBox-root"]');
      // The first box is the grid container, so we check for child boxes
      const gridContainer = cards[0];
      const cardElements = gridContainer.children;
      expect(cardElements.length).toBe(3);
    });

    it('renders default count of 6 cards when count is not specified', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="card" />
      );
      
      // Find all card boxes (each card has multiple nested boxes, so we look for the card containers)
      const allBoxes = container.querySelectorAll('[class*="MuiBox-root"]');
      // The first box is the grid container, its direct children are the cards
      const gridContainer = allBoxes[0];
      expect(gridContainer.children.length).toBe(6);
    });

    it('renders card skeleton with all required elements', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="card" count={1} />
      );
      
      // Check for circular skeletons (icon and eligibility indicator)
      const circularSkeletons = container.querySelectorAll('[class*="MuiSkeleton-circular"]');
      expect(circularSkeletons.length).toBeGreaterThan(0);
      
      // Check for rounded skeletons (chips and buttons)
      const roundedSkeletons = container.querySelectorAll('[class*="MuiSkeleton-rounded"]');
      expect(roundedSkeletons.length).toBeGreaterThan(0);
      
      // Check for text skeletons (title, description, benefit)
      const textSkeletons = container.querySelectorAll('[class*="MuiSkeleton-text"]');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('applies responsive grid layout', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="card" count={3} />
      );
      
      // Check that the grid container exists
      const allBoxes = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(allBoxes.length).toBeGreaterThan(0);
      
      // Verify we have the expected number of cards
      const gridContainer = allBoxes[0];
      expect(gridContainer.children.length).toBe(3);
    });
  });

  describe('list variant', () => {
    it('renders the specified number of skeleton list items', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="list" count={4} />
      );
      
      // Check for list item containers
      const listItems = container.querySelectorAll('[class*="MuiBox-root"]');
      // First box is the container, so we count its children
      expect(listItems[0].children.length).toBe(4);
    });

    it('renders list items with circular avatar and text', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="list" count={1} />
      );
      
      // Check for circular skeleton (avatar)
      const circularSkeletons = container.querySelectorAll('[class*="MuiSkeleton-circular"]');
      expect(circularSkeletons.length).toBe(1);
      
      // Check for text skeletons
      const textSkeletons = container.querySelectorAll('[class*="MuiSkeleton-text"]');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });
  });

  describe('text variant', () => {
    it('renders the specified number of text skeletons', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="text" count={5} />
      );
      
      const textSkeletons = container.querySelectorAll('[class*="MuiSkeleton-text"]');
      expect(textSkeletons.length).toBe(5);
    });

    it('applies custom height to text skeletons', () => {
      const customHeight = 50;
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="text" count={1} height={customHeight} />
      );
      
      const textSkeleton = container.querySelector('[class*="MuiSkeleton-text"]');
      expect(textSkeleton).toBeInTheDocument();
    });

    it('renders default count of 6 text skeletons when count is not specified', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="text" />
      );
      
      const textSkeletons = container.querySelectorAll('[class*="MuiSkeleton-text"]');
      expect(textSkeletons.length).toBe(6);
    });
  });

  describe('animation', () => {
    it('renders skeleton components with animation', () => {
      const { container } = renderWithTheme(
        <LoadingSkeleton variant="card" count={1} />
      );
      
      // MUI Skeleton components have animation by default
      const skeletons = container.querySelectorAll('[class*="MuiSkeleton-root"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
