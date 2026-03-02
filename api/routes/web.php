<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Preview Route for Billing Reminder Email
Route::get('/preview-billing-email', function () {
    return new App\Mail\BillingReminder(
        'Budi Santoso',
        '2026-03-02',
        'https://admin.afnet.my.id/billing/pay',
        'https://admin.afnet.my.id/support'
    );
});
