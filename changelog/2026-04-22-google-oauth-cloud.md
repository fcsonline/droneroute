## Summary

Replace email+password authentication with Google OAuth for cloud mode. Existing users must link their Google account to continue using the app, which also verifies their email.

## Changes

- Add Google OAuth sign-in for cloud mode using Google Identity Services
- Existing users with unverified emails are blocked until they link a matching Google account
- New cloud users sign up with one click via Google (no password needed)
- Self-hosted mode retains email+password authentication unchanged
- Add `/api/config` endpoint exposing public configuration to the frontend
- Add `google_id` and `email_verified` columns to the users table
- Disable password registration, login, and change-password routes in cloud mode
- Hide change-password form in account settings for cloud users
