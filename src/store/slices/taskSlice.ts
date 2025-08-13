import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { GroupTask, TaskCompletion } from '@/types'

interface TaskState {
  tasks: GroupTask[]
  taskCompletions: TaskCompletion[]
  currentTask: GroupTask | null
  loading: boolean
  error: string | null
}

const initialState: TaskState = {
  tasks: [],
  taskCompletions: [],
  currentTask: null,
  loading: false,
  error: null,
}

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<GroupTask[]>) => {
      state.tasks = action.payload
    },
    setTaskCompletions: (state, action: PayloadAction<TaskCompletion[]>) => {
      state.taskCompletions = action.payload
    },
    setCurrentTask: (state, action: PayloadAction<GroupTask | null>) => {
      state.currentTask = action.payload
    },
    addTask: (state, action: PayloadAction<GroupTask>) => {
      state.tasks.push(action.payload)
    },
    updateTask: (state, action: PayloadAction<GroupTask>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id)
      if (index !== -1) {
        state.tasks[index] = action.payload
      }
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = action.payload
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload)
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null
      }
    },
    addTaskCompletion: (state, action: PayloadAction<TaskCompletion>) => {
      state.taskCompletions.push(action.payload)
    },
    updateTaskCompletion: (state, action: PayloadAction<TaskCompletion>) => {
      const index = state.taskCompletions.findIndex(completion => completion.id === action.payload.id)
      if (index !== -1) {
        state.taskCompletions[index] = action.payload
      }
    },
    removeTaskCompletion: (state, action: PayloadAction<string>) => {
      state.taskCompletions = state.taskCompletions.filter(completion => completion.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearTasks: (state) => {
      state.tasks = []
      state.taskCompletions = []
      state.currentTask = null
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setTasks,
  setTaskCompletions,
  setCurrentTask,
  addTask,
  updateTask,
  removeTask,
  addTaskCompletion,
  updateTaskCompletion,
  removeTaskCompletion,
  setLoading,
  setError,
  clearTasks,
} = taskSlice.actions

export default taskSlice.reducer