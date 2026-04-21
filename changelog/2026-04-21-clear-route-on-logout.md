## Summary

Clear mission/route state on logout to prevent leaking route details after sign out.

## Changes

- Clear mission store when user logs out voluntarily
- Clear mission store on forced logout (banned user)
