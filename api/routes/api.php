<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WargaController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\RondaController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetLoanController;
use App\Http\Controllers\Api\GuestBookController;
use App\Http\Controllers\Api\PollController;
use App\Http\Controllers\Api\EmergencyController;
use App\Http\Controllers\Api\EmergencyAlertController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\BoardingHouseController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\KelurahanIntegrationController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\SaasAuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\SuperAdmin\SuperAdminRevenueController;
use App\Http\Controllers\SuperAdmin\SuperAdminTenantController;
use App\Http\Controllers\SuperAdmin\SuperAdminInvoiceController;

// Additional Controllers
use App\Http\Controllers\Api\BansosController;
use App\Http\Controllers\Api\CctvController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\IssueReportController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\PatrolController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RondaFineController;
use App\Http\Controllers\Api\RondaFineSettingController;
use App\Http\Controllers\Api\RondaLocationController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\SupportTicketController;

// Webhooks
    Route::post('/webhooks/flip/payment', [\App\Http\Controllers\FlipWebhookController::class, 'handlePayment']);

    // Public Routes
Route::prefix('auth')->group(function () {
    Route::post('/register-demo', [SaasAuthController::class, 'registerDemo']);
    Route::post('/register-live/step1', [SaasAuthController::class, 'registerLiveStep1']);
    Route::post('/register-live/step2', [SaasAuthController::class, 'verifyOtpAndCreateTenant']);
    Route::post('/login-otp', [SaasAuthController::class, 'loginOtp']);
    Route::post('/login/demo-mobile', [SaasAuthController::class, 'mobileDemoLogin']);
});

Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/app-settings', [SettingController::class, 'getPublicSettings']);

// TENANT Registration (SaaS Flow)
Route::post('/register', [SaasAuthController::class, 'register']);

// Warga Registration (Legacy/Invitation Flow)
Route::post('/register-warga', [AuthController::class, 'register']);

Route::post('/register-rt', [AuthController::class, 'registerRt']); // New RT Registration (Legacy?)
Route::post('/login', [AuthController::class, 'login'])->name('login');

// Region Routes (Public)
Route::prefix('regions')->group(function () {
    Route::get('/provinces', [RegionController::class, 'provinces']);
    Route::get('/cities/{provinceCode}', [RegionController::class, 'cities']);
    Route::get('/districts/{cityCode}', [RegionController::class, 'districts']);
    Route::get('/villages/{districtCode}', [RegionController::class, 'villages']);
});

// Protected Routes
// Super Admin Routes (READ-ONLY Financial Control)
Route::middleware(['auth:sanctum', 'role:SUPER_ADMIN'])->prefix('super-admin')->group(function () {
    Route::get('/revenue/summary', [SuperAdminRevenueController::class, 'summary']);
    Route::get('/revenue/monthly', [SuperAdminRevenueController::class, 'monthly']);
    Route::get('/tenants', [SuperAdminTenantController::class, 'index']);
    Route::get('/invoices', [SuperAdminInvoiceController::class, 'index']);
    Route::get('/invoices/{invoice}/download', [SuperAdminInvoiceController::class, 'download']);
    Route::get('/payment-settings', [\App\Http\Controllers\SuperAdmin\SuperAdminPaymentSettingsController::class, 'index']);
    Route::post('/payment-settings', [\App\Http\Controllers\SuperAdmin\SuperAdminPaymentSettingsController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'tenant.status', 'tenant.feature'])->group(function () {
    // SaaS Status
    Route::get('/tenant/status', [SaasAuthController::class, 'checkStatus']);
    
    // Billing Routes
    Route::prefix('billing')->name('billing.')->group(function () {
        Route::post('/subscribe', [BillingController::class, 'subscribe'])->name('subscribe');
        Route::get('/current', [BillingController::class, 'current'])->name('current');
        Route::get('/hierarchy', [BillingController::class, 'hierarchy'])->name('hierarchy');
    });

    // Payments Routes
    Route::prefix('payments')->name('payments.')->group(function () {
        // Step 6a: Generic Pay (Resolver) - keeping strictly if needed, but Step 6b asks for specific endpoint.
        // Step 6b says "POST /api/payments/pay".
        // If 6a implemented it in BillingController, we might want to consolidate or route to PaymentController.
        // BillingController::pay used Resolver. PaymentController::pay uses InstructionService (Centralized).
        // The prompt says "Implement STEP 6b... Create PaymentController... POST /api/payments/pay".
        // This likely replaces the logic or is the specific implementation for Centralized.
        // However, 6a was "Dual Payment Mode". 6b is "Centralized Payment Flow".
        // If I replace BillingController::pay with PaymentController::pay, I lose the Resolver logic (Split vs Centralized).
        // BUT, 6b instructions say "POST /api/payments/pay - Input: invoice_id, payment_channel (MANUAL | FLIP)".
        // This input suggests strict Centralized flow selection.
        // AND "Context: Payment strategy architecture exists... STEP 6b focuses ONLY on Centralized".
        // Maybe I should name it differently or integrate?
        // Let's use PaymentController::pay but ideally it should use the Resolver or Strategy?
        // Wait, 6b logic: "Action: Generate payment instruction... Return instruction JSON".
        // This is exactly what CentralizedStrategy does.
        // So PaymentController::pay is basically invoking CentralizedStrategy (via Service).
        // I will route /pay to PaymentController::pay.
        
        Route::post('/pay', [\App\Http\Controllers\PaymentController::class, 'pay'])->name('pay');
        Route::post('/{invoice}/confirm-manual', [\App\Http\Controllers\PaymentController::class, 'confirmManual'])->name('confirmManual');
    });

    // Invoices Routes
    Route::prefix('invoices')->name('invoices.')->group(function () {
        Route::get('/current', [\App\Http\Controllers\InvoiceController::class, 'current'])->name('current');
        Route::get('/{invoice}/download', [\App\Http\Controllers\InvoiceController::class, 'download'])->name('download');
        Route::post('/{invoice}/mark-paid', [\App\Http\Controllers\InvoiceController::class, 'markPaid'])->name('markPaid');
    });

    // Feature Status (New)
    Route::get('/tenant/feature-status', [\App\Http\Controllers\Api\TenantFeatureController::class, 'status']);

    // PDF Exports (Protected)
    Route::get('/reports/dues/pdf', [ReportController::class, 'exportDuesPdf'])->middleware('permission:laporan.export');
    Route::get('/rt/kas/export/pdf', [\App\Http\Controllers\Api\KasController::class, 'exportPdf'])->middleware('permission:laporan.export');
    Route::get('/rt/kas/export/expense-pdf', [\App\Http\Controllers\Api\KasController::class, 'exportExpensePdf'])->middleware('permission:laporan.export');

    // Missing Routes Fix (Fees & Reports)
    Route::get('/fees/arrears', [\App\Http\Controllers\Api\FeeController::class, 'arrears']);
    Route::get('/reports/summary', [\App\Http\Controllers\Api\ReportController::class, 'summary']);
    Route::get('/reports/dues', [\App\Http\Controllers\Api\ReportController::class, 'duesRecap']);
    
    // Legacy/Frontend Report Routes (Mapped to IssueReportController)
    // Must be defined AFTER specific /reports/... routes above to avoid conflict
    Route::put('/reports/{id}', [\App\Http\Controllers\Api\IssueReportController::class, 'updateStatus']);
    Route::apiResource('reports', IssueReportController::class);

    // Kas / Finance Routes
    Route::get('/rt/kas/summary', [\App\Http\Controllers\Api\KasController::class, 'summary'])->middleware('permission:kas.view');
    Route::get('/rt/kas/transactions', [\App\Http\Controllers\Api\KasController::class, 'index'])->middleware('permission:kas.view');
    Route::post('/rt/kas/transactions', [\App\Http\Controllers\Api\KasController::class, 'store'])->middleware('permission:kas.create');
    Route::post('/rt/kas/transfer', [\App\Http\Controllers\Api\KasController::class, 'transfer'])->middleware('permission:kas.create');
    Route::get('/rt/finance-accounts', [\App\Http\Controllers\Api\KasController::class, 'getAccounts'])->middleware('permission:kas.view');

    // External Integration Routes (Kelurahan) - Protected
    Route::prefix('v1/kelurahan')->group(function () {
        Route::get('/stats', [KelurahanIntegrationController::class, 'stats']);
        Route::post('/verify-citizen', [KelurahanIntegrationController::class, 'verifyCitizen']);
        Route::get('/pending-letters', [KelurahanIntegrationController::class, 'pendingLetters']);
        Route::get('/potential-bansos', [KelurahanIntegrationController::class, 'potentialBansos']);
    });

    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/rt/invite-code', [AuthController::class, 'getInviteCode'])->middleware('permission:user.invite'); // Get Invite Code
    
    // Warga Dashboard
    Route::get('/warga/dashboard', [App\Http\Controllers\Api\Warga\DashboardController::class, 'index'])->middleware('permission:dashboard.view');
    Route::get('/warga/bills', [App\Http\Controllers\Api\Warga\BillController::class, 'index'])->middleware('permission:iuran.view');
    Route::post('/warga/pay', [App\Http\Controllers\Api\Warga\BillController::class, 'pay'])->middleware('permission:iuran.pay');

    // Admin Dashboard (Premium)
    Route::get('/dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->middleware('permission:dashboard.view');

    Route::get('/warga/export', [WargaController::class, 'export'])->middleware('permission:laporan.export');
    Route::get('/warga/export-template', [WargaController::class, 'exportTemplate'])->middleware('permission:laporan.export');
    Route::post('/warga/import', [WargaController::class, 'import'])->middleware('permission:warga.create');
    Route::delete('/warga/reset', [WargaController::class, 'reset'])->middleware('permission:warga.delete');
    
    // Warga Resource Split for Permissions
    Route::get('warga/family', [WargaController::class, 'family']); // Family route must be before {warga}
    Route::post('warga/fix-orphans', [WargaController::class, 'fixOrphanWarga'])->middleware('permission:warga.update');
    Route::get('warga', [WargaController::class, 'index'])->middleware('permission:warga.view');
    Route::post('warga', [WargaController::class, 'store'])->middleware('permission:warga.create');
    Route::get('warga/{warga}', [WargaController::class, 'show'])->middleware('permission:warga.view');
    Route::match(['put', 'patch'], 'warga/{warga}', [WargaController::class, 'update'])->middleware('permission:warga.update');
    Route::delete('warga/{warga}', [WargaController::class, 'destroy'])->middleware('permission:warga.delete');
    
    Route::post('/transactions/confirm', [TransactionController::class, 'storePublic']); // Public submission for Warga
    Route::post('/transactions/{id}/verify', [TransactionController::class, 'verify'])->middleware('permission:kas.create'); // Verify adds to kas
    Route::apiResource('transactions', TransactionController::class)->except(['show', 'update']);

    // Ronda Routes
    Route::get('/schedules', [RondaController::class, 'index']); // Alias for PatrolScreen
    Route::post('/ronda-schedules/{id}/assign', [RondaController::class, 'assignWarga']);
    Route::delete('/ronda-schedules/{id}/users/{userId}', [RondaController::class, 'removeWarga']);
    Route::post('/ronda-schedules/clone', [RondaController::class, 'clone']);
    Route::put('/ronda-schedules/{scheduleId}/attendance/{userId}', [RondaController::class, 'updateAttendance']);
    Route::apiResource('ronda-schedules', RondaController::class);
    
    // Restored Resource Routes
    Route::get('announcements/{id}/comments', [AnnouncementController::class, 'getComments']);
    Route::post('announcements/{id}/comments', [AnnouncementController::class, 'comment']);
    Route::post('announcements/{id}/like', [AnnouncementController::class, 'like']);
    Route::apiResource('announcements', AnnouncementController::class);

    // Inventaris & Peminjaman Aset
    Route::apiResource('assets', AssetController::class);
    Route::post('/assets/loan', [AssetController::class, 'borrow']);
    Route::get('/assets/loans/my', [AssetController::class, 'myLoans']);
    Route::get('/assets/loans/requests', [AssetController::class, 'loanRequests']);
    Route::post('/assets/loans/{id}/approve', [AssetController::class, 'approveLoan']);
    Route::post('/assets/loans/{id}/reject', [AssetController::class, 'rejectLoan']);
    Route::post('/assets/loans/{id}/return', [AssetController::class, 'returnAsset']);

    Route::apiResource('asset-loans', AssetLoanController::class);
    Route::apiResource('guest-books', GuestBookController::class);
    Route::post('guest-books/{guest_book}/checkout', [GuestBookController::class, 'checkout']);

    // Voting Warga
    Route::apiResource('polls', PollController::class);
    Route::post('/polls/{poll}/vote', [PollController::class, 'vote']);
    
    // Emergency
    Route::get('/emergency/contacts', [EmergencyController::class, 'getContacts']);
    Route::post('/emergency/panic', [EmergencyController::class, 'triggerPanic']);
    Route::apiResource('emergencies', EmergencyController::class); 
    Route::apiResource('emergency-alerts', EmergencyAlertController::class);
    Route::post('/emergency-alerts/{emergency_alert}/resolve', [EmergencyAlertController::class, 'resolve']);
    Route::apiResource('emergency-contacts', EmergencyContactController::class);
    
    // Boarding House
    Route::apiResource('boarding-houses', BoardingHouseController::class);
    
    // Letters
    Route::apiResource('letters', LetterController::class);
    Route::apiResource('letter-types', LetterTypeController::class); // Added
    
    // Products & Stores
    Route::apiResource('products', ProductController::class);
    
    // Store Admin Routes
    Route::get('/stores/my', [StoreController::class, 'myStore']); // Explicit route for "my store"
    Route::get('/admin/stores', [StoreController::class, 'index']);
    Route::post('/admin/stores/{store}/verify', [StoreController::class, 'verify']);
    Route::apiResource('stores', StoreController::class); // Added
    
    // Settings
    Route::prefix('settings')->group(function () {
        // Profile
        Route::get('/profile', [SettingController::class, 'getProfile']);
        Route::post('/profile', [SettingController::class, 'updateProfile']); // or PUT? Frontend seems to accept both or I should check. Frontend calls axios.post for new, but profile update usually PUT/POST. Controller is updateProfile.

        // Wallets
        Route::get('/wallets', [SettingController::class, 'getWallets']);
        Route::post('/wallets', [SettingController::class, 'storeWallet']);
        Route::put('/wallets/{id}', [SettingController::class, 'updateWallet']);
        Route::delete('/wallets/{id}', [SettingController::class, 'deleteWallet']);

        // Activities
        Route::get('/activities', [SettingController::class, 'getActivities']);
        Route::post('/activities', [SettingController::class, 'storeActivity']);
        Route::put('/activities/{id}', [SettingController::class, 'updateActivity']);
        Route::delete('/activities/{id}', [SettingController::class, 'deleteActivity']);

        // Admins
        Route::get('/admins', [SettingController::class, 'getAdmins']);
        Route::post('/admins', [SettingController::class, 'storeAdmin']);
        Route::put('/admins/{id}', [SettingController::class, 'updateAdmin']);
        Route::delete('/admins/{id}', [SettingController::class, 'deleteAdmin']);
        
        // Roles
        Route::get('/roles', [SettingController::class, 'getRoles']);
        Route::post('/roles', [SettingController::class, 'storeRole']);
        Route::put('/roles/{id}', [SettingController::class, 'updateRole']);
        Route::delete('/roles/{id}', [SettingController::class, 'deleteRole']);

        Route::get('/dashboard-quick-actions', [SettingController::class, 'getDashboardQuickActions']);
        Route::post('/dashboard-quick-actions', [SettingController::class, 'saveDashboardQuickActions']);
    });
    
    // Bansos
    Route::get('bansos-histories', [BansosController::class, 'history']);
    Route::post('bansos-recipients/{id}/distribute', [BansosController::class, 'distribute']);
    Route::apiResource('bansos-recipients', BansosController::class);
    
    // CCTV
    Route::apiResource('cctvs', CctvController::class); // Added
    
    // Fees
    Route::apiResource('fees', FeeController::class); // Added
    
    // Issue Reports
    Route::apiResource('issue-reports', IssueReportController::class); // Added
    
    // Patrols (Mobile)
    Route::get('/patrols/today', [PatrolController::class, 'today']); // Added specifically for Dashboard
    Route::get('/patrols/mine', [PatrolController::class, 'getMySchedule']); // Added
    Route::apiResource('patrols', PatrolController::class); // Added
    
    // Notifications
    Route::get('/notifications/unread-count', [\App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'show']); // Added
    Route::post('/profile', [ProfileController::class, 'update']); // Added
    
    // Ronda Fines & Settings
    Route::apiResource('ronda-fines', RondaFineController::class); // Added
    Route::post('/ronda-fines/{fine}/pay', [RondaFineController::class, 'markAsPaid']);
    Route::apiResource('ronda-fine-settings', RondaFineSettingController::class); // Added
    Route::apiResource('ronda-locations', RondaLocationController::class); // Added
    Route::post('/ronda-locations/{location}/refresh-qr', [RondaLocationController::class, 'refreshQr']);

    // Support Tickets
    Route::get('support/tickets', [SupportTicketController::class, 'index']);
    Route::post('support/tickets', [SupportTicketController::class, 'store']);
});
