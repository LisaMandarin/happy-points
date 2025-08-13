# Happy Points - Project Documentation

## Overview
Happy Points is a Next.js/React application for tracking and managing points within groups. Users can earn and redeem points, create/join groups, and group admins can manage tasks with point rewards.

## Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (email/password + Google OAuth)
- **Styling**: Tailwind CSS with Ant Design components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── groups/            # Group-related components
│   ├── tasks/             # Task management components
│   └── ui/                # Reusable UI components (Ant Design + Tailwind)
├── store/                 # Zustand stores
│   ├── auth.ts            # Authentication store
│   ├── groups.ts          # Groups store
│   ├── tasks.ts           # Tasks store
│   └── transactions.ts    # Transactions store
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and Firebase setup
└── types/                 # TypeScript type definitions
```

## Key Features

### Authentication
- Email/password registration and login
- Google OAuth sign-in
- User profile management with username and password changes
- Error handling for authentication failures

### Points System
- Users have current points, total earned, and total redeemed
- Transaction history tracking
- Points can be earned through task completion

### Group Management
- Create groups with unique 6-character codes
- Join groups using group codes or invitation links
- Role-based permissions (admin vs member)
- Email invitation system with expiration
- View group members (admins see points, members see names only)

### Task Management (Admin Features)
- Create tasks with title, description, and point values
- Edit existing tasks
- Activate/deactivate tasks
- Delete tasks
- View task statistics

### Task Completion (Member Features)
- View active tasks in their groups
- Complete tasks (pending admin approval)
- Point awards upon admin approval

## Database Collections

### Core Collections
- `users` - User profiles and points
- `transactions` - Points transaction history
- `groups` - Group information and settings
- `groupMembers` - Group membership with roles
- `groupInvitations` - Email invitations with status tracking

### Task System Collections
- `groupTasks` - Tasks created by group admins
- `taskCompletions` - Task completion records and approval status

## State Management Structure

### Zustand Stores
- **auth** - User authentication and profile data
  - `user` - Firebase User object
  - `userProfile` - User profile with points data
  - `loading` - Authentication loading state
  - `error` - Auth-related errors

- **groups** - Group management state
  - `groups` - User's groups array
  - `currentGroup` - Selected group
  - `groupMembers` - Members of current group
  - `groupInvitations` - Group invitations
  - `joinRequests` - Pending join requests

- **tasks** - Task management state
  - `tasks` - Group tasks array
  - `taskCompletions` - Task completion records
  - `currentTask` - Selected task

- **transactions** - Points transaction history
  - `transactions` - Points transaction array

## Important Commands
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint` (run after code changes)
- **Type Check**: `npm run type-check` (if available)

## Environment Variables
Required Firebase configuration in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firebase Security Rules
The app uses Firestore security rules to protect data based on user authentication and group membership roles.

## Common Development Patterns

### State Management
- Zustand stores provide direct access to state and actions
- `useAuth` - Convenient wrapper for auth state from Zustand (`/src/hooks/useAuth.ts`)
- TanStack Query for server state management and caching

### Custom Hooks
- `useForm` - Form handling with validation
- `useAsyncOperation` - Async operations with loading states
- `useModalData` - Generic hook for modal data loading with error handling
- `useApproveReject` - Reusable hook for approve/reject operations

### Error Handling
- Centralized error messages in `src/lib/constants.ts`
- Form validation with field-specific error display
- Firebase auth error code mapping to user-friendly messages

### Modal Pattern
All modals follow a consistent pattern:
- Modal component with isOpen/onClose props
- Form handling with useForm hook
- Success/error message display
- Loading states during async operations

## Recent Changes
- **State Management Migration**: Migrated from React Context API to Zustand for lightweight state management
- **UI Framework Integration**: Added Ant Design components while maintaining Tailwind CSS for primary styling
- **Component Updates**: Updated Button, Input, Modal, Alert, and Badge components to use Ant Design
- **Zustand Stores**: Implemented 4 Zustand stores (auth, groups, tasks, transactions) for centralized state management
- **Data Fetching**: Added TanStack Query for server state management and caching
- **Authentication**: Migrated auth state from React Context to Zustand
- Added comprehensive task management system
- Implemented task creation and management for group admins
- Added task completion workflow with admin approval
- Enhanced error handling for login and password changes
- Added username propagation across database documents
- **Code Refactoring**: Eliminated duplicate functions across modal components with shared utilities

## Shared Utilities and Hooks

### Status Badge Utilities (`/src/lib/utils/statusBadges.tsx`)
Centralized status badge functions to eliminate duplication:
- `getApplicationStatusBadge(status)` - For task applications and join requests (pending/approved/rejected)
- `getInvitationStatusBadge(invitation)` - For group invitations with expiry logic
- `getTaskStatusBadge(task)` - For task active/inactive status

### Custom Hooks
- `useModalData<T>` (`/src/hooks/useModalData.ts`) - Generic hook for modal data loading with error handling and loading states
- `useApproveReject` (`/src/hooks/useApproveReject.ts`) - Reusable hook for approve/reject operations with consistent state management

### Refactored Components
The following modals now use shared utilities:
- `TaskApplicationsModal` - Uses `useModalData` and `useApproveReject` hooks
- `ReviewJoinRequestsModal` - Uses `useModalData` and `useApproveReject` hooks  
- `ManageInvitationsModal` - Uses `useModalData` hook and `getInvitationStatusBadge`
- `ManageTasksModal` - Uses `getTaskStatusBadge`

## Development Notes
- Always run linting after code changes
- Use batch operations for multi-document updates
- Follow existing component patterns for consistency
- Test authentication flows thoroughly
- Ensure proper error handling in all async operations
- **New modals should use shared utilities**: Import status badge functions and hooks instead of creating duplicates
- **Use `useModalData` for data loading**: Provides consistent loading states and error handling
- **Use `useApproveReject` for approve/reject workflows**: Handles common patterns with proper state management

## Firebase Indexes
Some queries require composite indexes. Create them through the Firebase Console when prompted by errors during development.