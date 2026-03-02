<?php

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Notification;
use App\Models\WilayahRt;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "--- STARTING NOTIFICATION SECURITY AUDIT ---\n";

try {
    DB::beginTransaction();

    // Get a valid RT
    $rt = WilayahRt::first();
    if (!$rt) {
        // Create one if not exists (though unlikely in seeded db)
        $rt = WilayahRt::create(['rt_name' => '001', 'rw_name' => '001', 'kelurahan' => 'Test', 'kecamatan' => 'Test', 'kota' => 'Test', 'provinsi' => 'Test', 'postal_code' => '12345']);
    }
    echo "[INFO] Using RT ID: {$rt->id}\n";

    // Create User A (Warga Tetap)
    echo "[INFO] Creating User A with role WARGA_TETAP...\n";
    $userA = User::create([
        'name' => 'Test User A',
        'email' => 'test_notif_a_' . time() . '@example.com',
        'password' => bcrypt('password'),
        'role' => 'WARGA_TETAP',
        'rt_id' => $rt->id,
    ]);

    // Create User B (Warga Tetap) - Different User
    echo "[INFO] Creating User B with role WARGA_TETAP...\n";
    $userB = User::create([
        'name' => 'Test User B',
        'email' => 'test_notif_b_' . time() . '@example.com',
        'password' => bcrypt('password'),
        'role' => 'WARGA_TETAP',
        'rt_id' => $rt->id,
    ]);

    echo "[INFO] Created Users: A ({$userA->id}), B ({$userB->id})\n";

    // 2. Create Notification for User B
    $notifB = Notification::create([
        'user_id' => $userB->id,
        'title' => 'Secret Notif for B',
        'message' => 'Private Message',
        'type' => 'INFO',
        'is_read' => false
    ]);

    echo "[INFO] Created Notification ID {$notifB->id} for User B\n";

    // 3. Simulate User A Requesting List
    Auth::login($userA);
    $controller = new \App\Http\Controllers\Api\NotificationController();
    
    $request = Illuminate\Http\Request::create('/api/notifications', 'GET');
    $request->setUserResolver(function () use ($userA) { return $userA; });
    
    echo "[INFO] User A requesting notification list...\n";
    $response = $controller->index($request);
    $data = $response->getData(true)['data']; // array of items

    $canSee = false;
    foreach ($data as $item) {
        if ($item['id'] == $notifB->id) {
            $canSee = true;
            break;
        }
    }

    if ($canSee) {
        echo "[FAIL] CRITICAL: User A can see User B's notification in index()!\n";
    } else {
        echo "[PASS] User A cannot see User B's notification in index().\n";
    }

    // 4. Simulate User A Requesting Unread Count
    $request = Illuminate\Http\Request::create('/api/notifications/unread-count', 'GET');
    $request->setUserResolver(function () use ($userA) { return $userA; });
    
    echo "[INFO] User A requesting unread count...\n";
    $response = $controller->unreadCount($request);
    $count = $response->getData(true)['count'];

    if ($count > 0) {
        echo "[WARN] User A has unread count $count (Expected 0). Checking if it counts B's notif...\n";
    } else {
        echo "[PASS] User A unread count is 0.\n";
    }

    // 5. Simulate User A trying to Mark Read User B's Notification
    $request = Illuminate\Http\Request::create("/api/notifications/{$notifB->id}/read", 'POST');
    $request->setUserResolver(function () use ($userA) { return $userA; });
    
    echo "[INFO] User A trying to mark User B's notification as read...\n";
    try {
        $controller->markAsRead($request, $notifB->id);
        echo "[FAIL] CRITICAL: User A successfully marked User B's notification as read!\n";
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        echo "[PASS] User A blocked from reading User B's notification (ModelNotFoundException).\n";
    } catch (\Exception $e) {
        echo "[INFO] Caught expected exception: " . get_class($e) . " - " . $e->getMessage() . "\n";
    }

    DB::rollBack();
    echo "[INFO] Transaction rolled back. Cleanup complete.\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "[ERROR] Script failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
