<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class SuperAdminInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['tenant', 'subscription'])
            ->latest();

        // Filters
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('payment_channel') && $request->payment_channel) {
            $query->where('payment_channel', $request->payment_channel);
        }

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('tenant', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
        }

        $invoices = $query->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $invoices, // Invoice model already has good serialization usually, or we can transform if needed
        ]);
    }

    public function download(Invoice $invoice)
    {
        // No strict tenant/role check here because middleware 'role:SUPER_ADMIN' handles it
        
        $invoice->load(['tenant', 'subscription', 'billingOwner']);

        $pdf = Pdf::loadView('invoices.invoice_pdf', [
            'invoice' => $invoice,
            'tenant' => $invoice->tenant,
            'subscription' => $invoice->subscription
        ]);

        return $pdf->download('invoice-' . $invoice->invoice_number . '.pdf');
    }
}
