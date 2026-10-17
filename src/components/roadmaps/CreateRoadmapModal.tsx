'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import styles from './CreateRoadmapModal.module.css';

export interface CreateRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, category: string) => Promise<void>;
}

export function CreateRoadmapModal({ isOpen, onClose, onSubmit }: CreateRoadmapModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Embedded & Systems Architecture');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a roadmap title');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(title.trim(), description.trim(), category);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create roadmap');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Learning Roadmap">
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.field}>
          <label htmlFor="roadmap-title" className={styles.label}>
            Roadmap Title
          </label>
          <input
            id="roadmap-title"
            type="text"
            className={styles.input}
            placeholder="e.g. GPU Architecture & CUDA Programming"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="roadmap-category" className={styles.label}>
            Domain / Category
          </label>
          <select
            id="roadmap-category"
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Embedded & Systems Architecture">Embedded &amp; Systems Architecture</option>
            <option value="Cloud & Distributed Infrastructure">Cloud &amp; Distributed Infrastructure</option>
            <option value="Programming Languages & Runtimes">Programming Languages &amp; Runtimes</option>
            <option value="AI / Machine Learning Engineering">AI / Machine Learning Engineering</option>
            <option value="Computer Graphics & Simulation">Computer Graphics &amp; Simulation</option>
            <option value="Cybersecurity & Reverse Engineering">Cybersecurity &amp; Reverse Engineering</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="roadmap-desc" className={styles.label}>
            Trajectory Overview &amp; Learning Objectives
          </label>
          <textarea
            id="roadmap-desc"
            className={styles.textarea}
            placeholder="Describe the end-to-end competency journey, prerequisite skills, and target mastery..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Roadmap
          </Button>
        </div>
      </form>
    </Modal>
  );
}
