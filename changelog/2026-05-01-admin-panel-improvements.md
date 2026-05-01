## Summary

Improved the admin panel with better usability: smaller page size, search, filtering, sorting, last login tracking, and confirmation dialogs for destructive actions.

## Changes

- Reduced default page size from 20 to 10
- Added search field to filter users by email (debounced)
- Added status filter dropdown (All / Active / Admin / Banned)
- Made table columns sortable by clicking headers (email, signed up, last login, routes)
- Added "Last login" column with `last_login_at` tracked on every sign-in
- Added confirmation dialogs before ban and demote actions
