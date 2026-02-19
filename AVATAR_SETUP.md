# Avatar Configuration Guide

This document explains how to configure and use the avatar/profile picture system on the Account page.

## Setup Instructions

### 1. Create Supabase Storage Bucket

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** (left sidebar)
4. Click **Create a new bucket**
5. Name it: `avatars`
6. Set it to **Public** (so images can be accessed publicly)
7. Click **Create bucket**

### 2. Set Storage Permissions (Optional but Recommended)

In your Supabase dashboard, under Storage → Policies:

Create a policy to allow authenticated users to upload their own avatars:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');
```

### 3. Update User Profiles Table

Make sure your `user_profiles` table has an `avatar_url` column:

```sql
ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
```

### 4. Current Implementation

The Account page now includes:

- **Avatar Display**: Shows the user's avatar from Supabase Storage with automatic fallback to initials
- **Avatar Utilities** (`src/lib/avatarUtils.ts`):
  - `getAvatarUrl()`: Fetches signed URLs for avatars
  - `uploadAvatar()`: Uploads avatar images
  - `deleteAvatar()`: Removes avatars

## Usage

### Basic Avatar Display

The avatar is automatically loaded on the Account page. It will:
1. Check `profile.avatar_url` from the database
2. Check `user.user_metadata.avatar_url` as fallback
3. Display user initials if no avatar exists

### Using the AvatarUpload Component

To add the avatar upload feature to the profile edit section:

```tsx
import { AvatarUpload } from '../components/AvatarUpload';

// In your form:
<AvatarUpload 
  userId={user!.id} 
  currentAvatarUrl={avatarUrl}
  onAvatarChange={(newUrl) => setAvatarUrl(newUrl)}
/>
```

## File Structure

```
src/
├── components/
│   └── AvatarUpload.tsx       # Avatar upload component
├── lib/
│   ├── supabase.ts            # Supabase client
│   └── avatarUtils.ts         # Avatar utility functions
└── pages/
    └── Account.tsx            # Account page with avatar display
```

## Features

✅ **Automatic avatar loading from Supabase**
✅ **Fallback to user initials**
✅ **Avatar upload component with validation**
✅ **File size and type validation (max 5MB, images only)**
✅ **Real-time preview before upload**
✅ **Public URL generation for display**
✅ **Error handling with user feedback**

## Database Schema

Expected `user_profiles` table structure:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,           -- Path in 'avatars' bucket
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Avatar not loading?

1. Check that the `avatars` bucket exists in Supabase Storage
2. Verify the bucket is set to **Public**
3. Check the browser console for any error messages
4. Ensure `profile.avatar_url` or `user.user_metadata.avatar_url` contains a valid path

### Upload fails?

1. Make sure the file is an image (JPG, PNG, GIF, etc.)
2. File size should be less than 5MB
3. Check Supabase Storage policies are set correctly
4. Verify user is authenticated

### Signed URL issues?

The `getPublicUrl()` method is used instead of signed URLs since the bucket is public. This works for public avatars. If you need temporary access control, use `createSignedUrl()` instead.

## Future Enhancements

Potential improvements:
- Image cropping/resizing before upload
- Multiple image format optimization
- Image compression
- Avatar frame/border customization
- Avatar from social media import
