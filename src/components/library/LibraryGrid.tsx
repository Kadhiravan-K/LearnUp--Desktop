import React from 'react';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import { LibraryCard } from './LibraryCard';
import styles from './LibraryGrid.module.css';

export interface LibraryGridProps {
  items: (LearningItem & { progress?: LibraryProgress })[];
  onEdit?: (item: LearningItem) => void;
  onDelete?: (item: LearningItem) => void;
}

export function LibraryGrid({ items, onEdit, onDelete }: LibraryGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <LibraryCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
