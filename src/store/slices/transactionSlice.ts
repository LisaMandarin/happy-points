import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PointsTransaction } from '@/types'

interface TransactionState {
  transactions: PointsTransaction[]
  loading: boolean
  error: string | null
}

const initialState: TransactionState = {
  transactions: [],
  loading: false,
  error: null,
}

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<PointsTransaction[]>) => {
      state.transactions = action.payload
    },
    addTransaction: (state, action: PayloadAction<PointsTransaction>) => {
      state.transactions.unshift(action.payload) // Add to beginning for chronological order
    },
    updateTransaction: (state, action: PayloadAction<PointsTransaction>) => {
      const index = state.transactions.findIndex(transaction => transaction.id === action.payload.id)
      if (index !== -1) {
        state.transactions[index] = action.payload
      }
    },
    removeTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter(transaction => transaction.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearTransactions: (state) => {
      state.transactions = []
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setTransactions,
  addTransaction,
  updateTransaction,
  removeTransaction,
  setLoading,
  setError,
  clearTransactions,
} = transactionSlice.actions

export default transactionSlice.reducer