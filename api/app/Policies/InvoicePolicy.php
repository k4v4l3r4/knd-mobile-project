<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class InvoicePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Only allow ADMIN_RW to list invoices? Or maybe ADMIN_RT for their own?
        // For now, allow both to list, but filtering should happen in Controller.
        return $user->userRole && in_array($user->userRole->role_code, ['ADMIN_RW', 'ADMIN_RT']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Invoice $invoice): bool
    {
        if (!$user->tenant) {
            return false;
        }

        // Must be the billing owner
        if ($user->tenant->id !== $invoice->billing_owner_id) {
            return false;
        }

        // Must be ADMIN_RW or ADMIN_RT
        if (!$user->role) {
            return false;
        }

        if ($user->role->role_code === 'ADMIN_RW') {
            return true;
        }

        if ($user->role->role_code === 'ADMIN_RT') {
            // RT users are BLOCKED from RW billing, but this check ensures they only see their OWN invoices (billing_owner_id check above).
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Only system creates invoices via subscription flow
        return false;
    }

    /**
     * Determine whether the user can update the model (e.g. mark paid).
     */
    public function update(User $user, Invoice $invoice): bool
    {
        // Same as view logic
        return $this->view($user, $invoice);
    }
    
    public function markPaid(User $user, Invoice $invoice): bool
    {
        return $this->update($user, $invoice);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Invoice $invoice): bool
    {
        return false;
    }
}
