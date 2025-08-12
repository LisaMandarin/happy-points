'use client'

import React from 'react'
import { Modal, Button, Input, Alert } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { TaskFormData, GroupTask } from '@/types'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTask: (taskData: { title: string; description: string; points: number }) => Promise<void>
  editingTask?: GroupTask | null
  onUpdateTask?: (taskId: string, taskData: { title: string; description: string; points: number }) => Promise<void>
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
  editingTask,
  onUpdateTask
}) => {
  const isEditing = !!editingTask

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFieldError,
  } = useForm<TaskFormData>({
    initialValues: {
      title: editingTask?.title || '',
      description: editingTask?.description || '',
      points: editingTask?.points?.toString() || '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.title.trim()) {
        errors.title = 'Task title is required'
      } else if (values.title.trim().length < 3) {
        errors.title = 'Task title must be at least 3 characters'
      }
      
      if (!values.description.trim()) {
        errors.description = 'Task description is required'
      } else if (values.description.trim().length < 10) {
        errors.description = 'Task description must be at least 10 characters'
      }
      
      if (!values.points) {
        errors.points = 'Points are required'
      } else {
        const pointsNum = parseInt(values.points)
        if (isNaN(pointsNum) || pointsNum <= 0) {
          errors.points = 'Points must be a positive number'
        } else if (pointsNum > 10000) {
          errors.points = 'Points cannot exceed 10,000'
        }
      }
      
      return errors
    },
    onSubmit: async (values) => {
      try {
        const taskData = {
          title: values.title.trim(),
          description: values.description.trim(),
          points: parseInt(values.points)
        }

        if (isEditing && editingTask && onUpdateTask) {
          await onUpdateTask(editingTask.id, taskData)
        } else {
          await onCreateTask(taskData)
        }

        handleClose()
      } catch (error) {
        setFieldError('general', error instanceof Error ? error.message : 'Failed to save task')
      }
    },
  })

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? `Edit Task: ${editingTask?.title}` : 'Create New Task'}
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            {isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isEditing && editingTask && (
          <div className="bg-blue-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              📝 Editing Task:
            </h4>
            <div className="text-sm text-blue-800">
              <p><strong>Current Name:</strong> {editingTask.title}</p>
              <p><strong>Current Points:</strong> {editingTask.points} points</p>
              <p><strong>Status:</strong> {editingTask.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        )}

        {errors.general && (
          <Alert variant="error">
            {errors.general}
          </Alert>
        )}

        <Input
          label={isEditing ? `Task Title (Current: "${editingTask?.title}")` : "Task Title"}
          value={values.title}
          onChange={handleChange('title')}
          error={errors.title}
          placeholder={isEditing ? editingTask?.title || "Enter task title" : "Enter task title"}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isEditing ? `Task Description (Current: "${editingTask?.description?.substring(0, 50)}${(editingTask?.description?.length || 0) > 50 ? '...' : ''}")` : "Task Description"} *
          </label>
          <textarea
            value={values.description}
            onChange={(e) => handleChange('description')(e as any)}
            className={`
              w-full px-3 py-2 border rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:border-transparent
              ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            rows={4}
            placeholder={isEditing ? editingTask?.description || "Describe what needs to be done to complete this task..." : "Describe what needs to be done to complete this task..."}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <Input
          label={isEditing ? `Points Reward (Current: ${editingTask?.points} points)` : "Points Reward"}
          type="number"
          value={values.points}
          onChange={handleChange('points')}
          error={errors.points}
          placeholder={isEditing ? editingTask?.points?.toString() || "Enter points to award" : "Enter points to award"}
          min="1"
          max="10000"
          required
        />

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            💡 Task Guidelines:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Make the title clear and specific</li>
            <li>• Provide detailed instructions in the description</li>
            <li>• Set appropriate point values based on task difficulty</li>
            <li>• Tasks will be visible to all group members</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}

export default CreateTaskModal