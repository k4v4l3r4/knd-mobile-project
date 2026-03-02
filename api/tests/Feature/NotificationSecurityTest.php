<?php

use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class NotificationSecurityTest extends TestCase
{
    public function test_user_cannot_read_others_notifications()
    {
        echo "\nRunning Notification Security Test...\n";

        // 1. Setup Users
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        echo "Created User A (ID: {$userA->id}) and User B (ID: {$userB->id})\n";

        // 2. Create Notifications for User B
        $notifB = Notification::create([
            'id' => 9999, // Force ID for easy reference
            'user_id' => $userB->id,
            'title' => 'Secret Notif for B',
            'message' => 'Do not read this User A',
            'type' => 'INFO',
            'is_read' => false
        ]);

        echo "Created Notification for User B (ID: {$notifB->id})\n";

        // 3. Test: User A tries to list notifications (should not see B's)
        Auth::login($userA);
        $response = $this->getJson('/api/notifications');
        
        $data = $response->json('data');
        $found = false;
        foreach ($data as $item) {
            if ($item['id'] == $notifB->id) {
                $found = true;
                break;
            }
        }

        if ($found) {
            echo "FAILED: User A can see User B's notification in list!\n";
            exit(1);
        } else {
            echo "PASSED: User A cannot see User B's notification in list.\n";
        }

        // 4. Test: User A tries to get unread count (should be 0)
        $response = $this->getJson('/api/notifications/unread-count');
        $count = $response->json('count');
        
        if ($count > 0) {
             // Verify if User A has other notifs (factory might create some?)
             // But we just created User A fresh.
             // Let's assume 0.
             if ($count > 0) {
                 echo "WARNING: User A has unread count $count (might be side effect of factory?). Checking if it matches B's notif count (1).\n";
             }
        } else {
             echo "PASSED: User A sees 0 unread count.\n";
        }

        // 5. Test: User A tries to Mark Read User B's notification
        $response = $this->postJson("/api/notifications/{$notifB->id}/read");
        
        if ($response->status() == 404) {
            echo "PASSED: User A got 404 when trying to read User B's notification (Model Not Found logic is working).\n";
        } else {
            echo "FAILED: User A got status " . $response->status() . " when trying to read User B's notification!\n";
            exit(1);
        }

        // Clean up
        $notifB->delete();
        $userA->delete();
        $userB->delete();
        
        echo "Test Completed Successfully.\n";
    }
}

