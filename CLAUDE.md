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
- `notifications` - User notifications for various events

### Task System Collections
- `groupTasks` - Tasks created by group admins
- `taskCompletions` - Task completion records and approval status

### Activity System Collections
- `activities` - Activity logs for user actions and events

### Penalty System Collections
- `groupPenalties` - Penalty records for group members
- `groupPenaltyTypes` - Predefined penalty types for groups

### Prize System Collections
- `groupPrizes` - Prizes that can be redeemed with points
- `groupPrizeRedemptions` - Prize redemption records
- `prizeRedemptionApplications` - Pending prize redemption applications

## State Management Structure

### Zustand Stores
- **authStore** (`/src/stores/authStore.ts`) - User authentication and profile data
  - `user` - Firebase User object
  - `userProfile` - User profile with points data
  - `loading` - Authentication loading state
  - `error` - Auth-related errors
  - `setUser()` - Update user state
  - `setUserProfile()` - Update user profile
  - `ensureUserProfile()` - Create profile if missing
  - `refreshProfile()` - Refresh user profile data
  - `initializeAuth()` - Initialize auth state listener

### TanStack Query State Management
The application uses TanStack Query for server state management with custom hooks organized in `/src/hooks/queries/`

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
- TanStack Query for server state management and caching

### Custom Hooks
- `useAuth` (`/src/hooks/useAuth.ts`) - Convenient wrapper for auth state from Zustand
- `useForm` (`/src/hooks/useForm.ts`) - Form handling with validation
- `useAsyncOperation` (`/src/hooks/useAsyncOperation.ts`) - Async operations with loading states
- `useModalData` (`/src/hooks/useModalData.ts`) - Generic hook for modal data loading with error handling
- `useApproveReject` (`/src/hooks/useApproveReject.ts`) - Reusable hook for approve/reject operations
- `useUserGroupPointsBreakdown` (`/src/hooks/useUserGroupPointsBreakdown.ts`) - Calculate user points breakdown across groups

### TanStack Query Hooks (`/src/hooks/queries/`)
- `useGroups` - Group management queries and mutations
- `useNotifications` - Notification queries and mutations
- `usePendingItems` - Queries for pending admin actions
- `useTasks` - Task management queries and mutations
- `useTransactions` - Transaction history queries

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

## Key Library Functions

### Core Library Functions (`/src/lib/`)

#### Authentication (`/src/lib/auth.ts`)
- `onAuthStateChange()` - Listen to Firebase auth state changes
- `signInWithEmail()` - Email/password sign in
- `signInWithGoogle()` - Google OAuth sign in
- `signUp()` - Create new user account
- `signOut()` - Sign out current user
- `updateUserPassword()` - Update user password
- `sendPasswordReset()` - Send password reset email

#### Firestore Operations (`/src/lib/firestore.ts`)
- `createUserProfile()` - Create user profile in Firestore
- `getUserProfile()` - Get user profile by ID
- `getUserByEmail()` - Get user profile by email
- `updateUserProfile()` - Update user profile
- `updateUsernameAcrossDatabase()` - Update username across all collections
- `addPointsTransaction()` - Add points transaction and update user points
- `getUserTransactions()` - Get user transaction history
- `createUserNotification()` - Create notification for user
- `getUserNotifications()` - Get user notifications
- `markNotificationAsRead()` - Mark notification as read
- `getUnreadNotificationsCount()` - Get count of unread notifications
- `createGroupPenalty()` - Create penalty and deduct points
- `getGroupPenalties()` - Get penalties for a group
- `createGroupPenaltyType()` - Create penalty type template
- `getGroupPenaltyTypes()` - Get penalty types for a group
- `createGroupPrize()` - Create redeemable prize
- `getGroupPrizes()` - Get prizes for a group
- `createPrizeRedemptionApplication()` - Apply for prize redemption
- `approvePrizeRedemptionApplication()` - Approve prize redemption
- `rejectPrizeRedemptionApplication()` - Reject prize redemption

#### Group Operations (`/src/lib/groups.ts`)
- `createGroup()` - Create new group with unique code
- `getGroup()` - Get group by ID
- `getGroupByCode()` - Get group by join code
- `getUserGroups()` - Get user's group memberships
- `addGroupMember()` - Add member to group
- `getGroupMember()` - Get specific group member
- `getGroupMembers()` - Get all group members
- `getActiveGroupMembers()` - Get only active group members
- `deactivateGroupMember()` - Deactivate member (admin only)
- `activateGroupMember()` - Reactivate member (admin only)
- `sendGroupInvitations()` - Send email invitations to join group
- `getInvitationByCode()` - Get invitation details by code
- `acceptInvitation()` - Accept group invitation
- `getGroupInvitations()` - Get invitations for a group
- `cancelInvitation()` - Cancel/expire invitation
- `resendInvitation()` - Resend invitation with new code
- `generateInvitationLink()` - Generate invitation URL
- `getPendingGroupInvitations()` - Get pending invitations for admin
- `getAdminGroupStats()` - Get statistics for admin's groups

#### Task Operations (`/src/lib/tasks.ts`)
- `createGroupTask()` - Create task for group (admin only)
- `getGroupTasks()` - Get all tasks for group
- `getActiveGroupTasks()` - Get active tasks only
- `getGroupTask()` - Get single task by ID
- `updateGroupTask()` - Update task (admin only)
- `deleteGroupTask()` - Delete task (admin only)
- `completeTask()` - Submit task completion (member)
- `getTaskCompletion()` - Get task completion record
- `getGroupTaskCompletions()` - Get completions for group
- `approveTaskCompletion()` - Approve completion and award points
- `rejectTaskCompletion()` - Reject task completion
- `awardPointsToMember()` - Directly award points to member
- `getPendingTaskApplications()` - Get pending applications for admin
- `getAdminTaskStats()` - Get task statistics for admin

#### Activity Logging (`/src/lib/activities.ts`)
- `logActivity()` - Log user activity
- `getUserActivities()` - Get user's activity history
- `getGroupActivities()` - Get activities for a group
- `Activities` - Helper object with pre-defined activity creators:
  - `pointsEarned()` - Points earned activity
  - `pointsRedeemed()` - Points redeemed activity
  - `groupCreated()` - Group creation activity
  - `groupJoined()` - Group join activity
  - `taskCreated()` - Task creation activity
  - `taskApplicationSubmitted()` - Task application activity
  - `taskApplicationApproved()` - Task approval activity
  - `taskApplicationRejected()` - Task rejection activity
  - `memberRemoved()` - Member deactivation activity
  - `memberActivated()` - Member activation activity
  - Plus many more predefined activity types
- `getActivityDisplay()` - Get display styling for activity types

#### Utility Functions (`/src/lib/utils.ts`)
- Various utility functions for data formatting and validation

#### Constants (`/src/lib/constants.ts`)
- `COLLECTIONS` - Firestore collection names
- `DEFAULT_VALUES` - Default values for various entities
- `ERROR_MESSAGES` - Centralized error messages
- `SUCCESS_MESSAGES` - Success notification messages

## Recent Changes
- **Prize Redemption System**: Added complete prize management with applications and admin approval workflow
- **Penalty System**: Added penalty types and penalty application system for group admins
- **Activity Logging**: Comprehensive activity tracking system for user actions and events
- **Notification System**: In-app notifications for various user events
- **State Management Migration**: Migrated from React Context API to Zustand + TanStack Query
- **UI Framework Integration**: Added Ant Design components while maintaining Tailwind CSS
- **Member Management**: Added member activation/deactivation instead of permanent removal
- **Enhanced Task System**: Full task lifecycle with applications, approvals, and point awards
- **Username Propagation**: Automatic username updates across all database collections
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