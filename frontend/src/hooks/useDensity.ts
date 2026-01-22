/**
 * Hook for getting spacing values based on density setting
 */

import { useStore, type Density } from '../store';

interface DensitySpacing {
  // Base spacing unit multiplier
  unit: number;
  // Card/list item gap
  gap: number;
  // Padding inside cards
  cardPadding: number;
  // Grid spacing
  gridSpacing: number;
  // List item padding
  listItemPadding: number;
}

const densityMap: Record<Density, DensitySpacing> = {
  compact: {
    unit: 0.5,
    gap: 1,
    cardPadding: 1.5,
    gridSpacing: 1,
    listItemPadding: 0.5,
  },
  comfortable: {
    unit: 1,
    gap: 2,
    cardPadding: 2,
    gridSpacing: 2,
    listItemPadding: 1,
  },
  spacious: {
    unit: 1.5,
    gap: 3,
    cardPadding: 3,
    gridSpacing: 3,
    listItemPadding: 1.5,
  },
};

export function useDensity(): DensitySpacing & { density: Density } {
  const density = useStore((state) => state.density);
  return {
    density,
    ...densityMap[density],
  };
}
