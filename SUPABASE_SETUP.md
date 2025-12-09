# Supabase Setup Guide

## Getting Your Anon Key

The error you're seeing (400 Bad Request) means the anon key format is wrong.

### Step-by-Step Instructions:

1. **Go to**: https://app.supabase.com
2. **Select your project**: ngkmhrckbybqghzfyorp
3. **Click**: Settings (⚙️ gear icon in left sidebar)
4. **Click**: API (in the settings menu)
5. **Scroll down to**: "Project API keys"

You will see a section like this:

```
Project API keys

anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg5MTI0MDAsImV4cCI6MTk5NDQ4ODQwMH0.xxxxxx
[Copy button]

service_role secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3ODkxMjQwMCwiZXhwIjoxOTk0NDg4NDAwfQ.xxxxxx
[Copy button]
```

### What to Copy:

- ✅ **Copy the "anon public" key** (the very long string starting with `eyJhbGci...`)
- ❌ **DO NOT use** the "service_role secret" key
- ❌ **DO NOT use** any key starting with `sb_publishable_`

### Expected Format:

The correct anon key should be:
- **Very long** (300-500+ characters)
- **Starts with**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`
- **Has dots**: It's a JWT token with 3 parts separated by dots (xxxxx.yyyyy.zzzzz)

### Update Your .env:

```bash
VITE_SUPABASE_URL=https://ngkmhrckbybqghzfyorp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg5MTI0MDAsImV4cCI6MTk5NDQ4ODQwMH0.YOUR_ACTUAL_KEY_HERE
```

## Enable Email Authentication

After fixing the key, make sure email auth is enabled:

1. Go to: **Authentication** → **Providers**
2. Find **Email** provider
3. Make sure it's **enabled**
4. Optional: Turn off "Confirm email" for easier testing (you can re-enable later)

## Testing

After updating the `.env` file:
1. Restart the dev server (it should auto-reload)
2. Try signing up with any email/password
3. Check the browser console for "✅ Supabase configuration loaded" message
