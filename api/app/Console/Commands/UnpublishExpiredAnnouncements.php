<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Announcement;
use Carbon\Carbon;

class UnpublishExpiredAnnouncements extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'announcements:unpublish-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Unpublish announcements that have passed their expiration date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = Announcement::where('status', 'PUBLISHED')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->update(['status' => 'DRAFT']);

        if ($count > 0) {
            $this->info("Successfully unpublished {$count} expired announcements.");
        } else {
            $this->info('No expired announcements found.');
        }
    }
}
