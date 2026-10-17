import React from 'react';
import { AddCourseModal, AddCourseModalProps } from '@/components/course/AddCourseModal';

export type ImportModalProps = AddCourseModalProps;

export function ImportModal(props: ImportModalProps) {
  return <AddCourseModal {...props} />;
}
