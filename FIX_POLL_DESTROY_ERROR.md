# Fix PollController::destroy Method Not Found Error

## Problem
Production error log shows:
```
Method App\Http\Controllers\Api\PollController::destroy does not exist
```

Error occurs when trying to DELETE a poll via `/api/polls/{id}` endpoint.

## Root Cause Analysis

### 1. **Route Cache Issue** (MOST LIKELY)
- Laravel's route cache on production server is outdated
- Routes were added/modified but cache wasn't refreshed
- Common issue when deploying code changes

### 2. **Missing .htaccess Configuration**
- Apache web server might not be handling DELETE method properly
- URL rewriting rules might be blocking certain HTTP methods

### 3. **Autoload Files Outdated**
- Composer autoload files might need regeneration

## Verification Results

✅ **Local Environment Status:**
- `destroy()` method EXISTS in PollController (line 253)
- Route `DELETE /api/polls/{poll}` is REGISTERED
- All required methods present in controller
- Code structure is CORRECT

❌ **Production Server Issue:**
- Route cache is STALE
- Method not being recognized by Laravel router

## Solution Steps

### For Production Server (knd-mobile-project)

#### Step 1: SSH Access to Server
```bash
ssh user@your-server.com
cd /www/wwwroot/knd-mobile-project
```

#### Step 2: Clear All Laravel Caches
```bash
cd api
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

#### Step 3: Regenerate Autoload Files
```bash
composer dump-autoload --optimize
```

#### Step 4: Optimize Routes (Optional but Recommended)
```bash
php artisan route:cache
php artisan config:cache
```

#### Step 5: Verify Routes
```bash
php artisan route:list | grep polls
```

Expected output should include:
```
DELETE   api/polls/{poll} › PollController@destroy
GET|HEAD api/polls/{poll} › PollController@show
POST     api/polls/{poll} › PollController@store  
PUT|PATCH api/polls/{poll} › PollController@update
```

#### Step 6: Check .htaccess File
Ensure `/www/wwwroot/knd-mobile-project/api/public/.htaccess` exists with:

```apache
<IfModule Mod_RewriteModule>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

#### Step 7: Check File Permissions
```bash
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### Step 8: Restart Web Server (if needed)
```bash
# For Apache
sudo systemctl restart apache2

# For Nginx + PHP-FPM
sudo systemctl restart nginx
sudo systemctl restart php-fpm
```

### Alternative: Quick Fix Script

Create and run this script on production server:

```php
<?php
// File: /www/wwwroot/knd-mobile-project/api/fix_destroy.php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Clearing caches...\n";
Illuminate\Support\Facades\Artisan::call('cache:clear');
Illuminate\Support\Facades\Artisan::call('config:clear');
Illuminate\Support\Facades\Artisan::call('route:clear');
Illuminate\Support\Facades\Artisan::call('view:clear');

echo "Optimizing...\n";
Illuminate\Support\Facades\Artisan::call('config:cache');
Illuminate\Support\Facades\Artisan::call('route:cache');

echo "Done!\n";
```

Run via browser or CLI:
```bash
cd /www/wwwroot/knd-mobile-project/api
php fix_destroy.php
```

Then delete the file:
```bash
rm fix_destroy.php
```

## Testing After Fix

### Test 1: Using cURL
```bash
curl -X DELETE https://admin.afnet.my.id/api/polls/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test 2: Using Postman
- Method: DELETE
- URL: `https://admin.afnet.my.id/api/polls/{id}`
- Headers: 
  - `Authorization: Bearer {token}`
  - `Accept: application/json`
- Expected Response: `{"message": "Voting berhasil dihapus"}`

### Test 3: From Mobile App
Try deleting a poll from the mobile app - should work without errors.

## Prevention Measures

### 1. Deployment Checklist
Always run these commands after deploying code changes:
```bash
cd api
php artisan cache:clear
php artisan config:clear
php artisan route:clear
composer dump-autoload --optimize
```

### 2. Use Deployment Script
Create a deployment script (`deploy.sh`):

```bash
#!/bin/bash
cd /www/wwwroot/knd-mobile-project/api

# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev --optimize-autoloader

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize
php artisan config:cache
php artisan route:cache

# Migrate database
php artisan migrate --force

# Restart queue workers (if using queues)
php artisan queue:restart

echo "Deployment complete!"
```

### 3. CI/CD Pipeline
If using GitHub Actions, GitLab CI, etc., add cache clearing steps:

```yaml
- name: Clear Laravel Caches
  run: |
    cd api
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
```

## Related Files

- **Controller**: `api/app/Http/Controllers/Api/PollController.php` (line 253)
- **Routes**: `api/routes/api.php` (line 253)
- **Model**: `api/app/Models/Poll.php`
- **Public Entry Point**: `api/public/index.php`
- **Apache Config**: `api/public/.htaccess`

## Error Log Locations

Monitor these logs after applying fix:
```
/www/wwwroot/knd-mobile-project/api/storage/logs/laravel.log
/var/log/apache2/error.log  # Apache
/var/log/nginx/error.log    # Nginx
```

## Success Criteria

✅ DELETE requests to `/api/polls/{id}` return 200 OK  
✅ No more "Method does not exist" errors in logs  
✅ Poll deletion works from mobile app  
✅ Error logs show successful deletions  

## Rollback Plan

If issues persist after fix:

1. **Disable route caching temporarily:**
   ```bash
   php artisan route:clear
   ```

2. **Check for conflicting routes:**
   ```bash
   php artisan route:list | grep polls
   ```

3. **Verify controller namespace:**
   ```bash
   grep -r "PollController" api/routes/
   ```

4. **Test with simple route:**
   Add test route to verify DELETE method works:
   ```php
   // In api/routes/api.php
   Route::delete('/test-poll', function() {
       return response()->json(['message' => 'DELETE works']);
   });
   ```

## Contact Information

If problem persists after trying all steps:
- Check Laravel documentation: https://laravel.com/docs/routing
- Review server error logs
- Consider checking with hosting provider for server-level restrictions

---

**Status**: ✅ SOLUTION PROVIDED  
**Priority**: HIGH - Production Issue  
**Estimated Fix Time**: 5-10 minutes
