'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import Link from 'next/link';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { learningItemsApi } from '@/lib/api/learning-items';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import type { RoadmapNode, AttachedCourseData } from '@/lib/types';
import styles from './AttachCourseModal.module.css';

export interface AttachCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: RoadmapNode;
  onSubmit: (nodeId: string, courseData: AttachedCourseData) => Promise<void>;
}

export function AttachCourseModal({ isOpen, onClose, node, onSubmit }: AttachCourseModalProps) {
  const { items: courses, isLoading: isLoadingCourses, error: coursesError } = useLibrary();
  const [selectedCourseId, setSelectedCourseId] = useState(node.attached_course?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCourseId(node.attached_course?.id || '');
    setError(null);
  }, [node.id, node.attached_course?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find((item) => item.id === selectedCourseId);
    if (!course) {
      setError('Select a course from your library before linking this milestone.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const progressPercentage = course.progress?.progress_percentage ?? 0;
      let totalLectures = 1;
      if (course.type === 'playlist') {
        const courseDetails = await learningItemsApi.getLearningItem(course.id);
        totalLectures = courseDetails.videos?.length ?? 0;
        if (totalLectures === 0) {
          throw new Error('This playlist has no available videos to attach.');
        }
      }

      const courseData: AttachedCourseData = {
        id: course.id,
        title: course.title,
        provider: course.author || 'YouTube',
        total_lectures: totalLectures,
        progress_percentage: progressPercentage,
        runtime_formatted: `${formatPercentage(progressPercentage)}% complete`
      };

      await onSubmit(node.id, courseData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Course to Node ${node.node_number}: ${node.title}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <Alert variant="error">{error}</Alert>}
        {coursesError && <Alert variant="error">{coursesError}</Alert>}

        <div className={styles.field}>
          <label htmlFor="library-course" className={styles.label}>
            Course from your library
          </label>
          <select
            id="library-course"
            className={styles.input}
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            disabled={isLoadingCourses || isSubmitting}
            required
          >
            <option value="">
              {isLoadingCourses ? 'Loading library...' : 'Choose a course or playlist'}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.type})
              </option>
            ))}
          </select>
        </div>

        {courses.length === 0 && !isLoadingCourses && (
          <p className={styles.emptyLibrary}>
            Your library is empty. <Link href="/library">Import a course first</Link>, then attach it here.
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!selectedCourseId || isLoadingCourses}>
            Confirm Link
          </Button>
        </div>
      </form>
    </Modal>
  );
}
