<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fee;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class FeeController extends Controller
{
    /**
     * Get list of residents with arrears (tunggakan) for specific month/year.
     */
    public function arrears(Request $request)
    {
        $user = $request->user();
        $month = $request->input('month', Carbon::now()->month);
        $year = $request->input('year', Carbon::now()->year);
        $asOfDate = $request->input('date')
            ? Carbon::parse($request->input('date'))
            : Carbon::createFromDate($year, $month, Carbon::now()->day);
        
        // 1. Get mandatory fees
        $mandatoryFees = Fee::where('rt_id', $user->rt_id)
            ->where('is_mandatory', true)
            ->get()
            ->filter(function (Fee $fee) use ($asOfDate, $month, $year) {
                if (!$fee->billing_day) {
                    return true;
                }
                $billingDate = Carbon::create($year, $month, $fee->billing_day, 0, 0, 0);
                return $asOfDate->greaterThanOrEqualTo($billingDate);
            });

        if ($mandatoryFees->isEmpty()) {
            return response()->json([]);
        }

        // 2. Get all residents (Warga)
        $residents = User::where('rt_id', $user->rt_id)
            ->where('role', 'WARGA') // Assuming role 'WARGA' exists
            ->get();

        $arrearsList = [];

        foreach ($residents as $resident) {
            $residentArrears = [];
            
            // Get user's successful transactions for this period
            $transactions = Transaction::where('user_id', $resident->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->where('status', '!=', 'REJECTED')
                ->get();

            foreach ($mandatoryFees as $fee) {
                $isPaid = false;
                foreach ($transactions as $trx) {
                    $items = $trx->items ?? [];
                    if (is_array($items)) {
                        foreach ($items as $item) {
                            if (isset($item['fee_id']) && $item['fee_id'] == $fee->id) {
                                $isPaid = true;
                                break 2;
                            }
                        }
                    }
                }

                if (!$isPaid) {
                    $residentArrears[] = [
                        'fee_id' => $fee->id,
                        'fee_name' => $fee->name,
                        'amount' => $fee->amount,
                        // Simple fine logic: 0 for now, or could be dynamic
                        'fine' => 0 
                    ];
                }
            }

            if (!empty($residentArrears)) {
                $arrearsList[] = [
                    'user' => [
                        'id' => $resident->id,
                        'name' => $resident->name,
                        'address' => $resident->address,
                        'phone' => $resident->phone,
                    ],
                    'unpaid_fees' => $residentArrears,
                    'total_arrears' => collect($residentArrears)->sum('amount'),
                    'total_fine' => collect($residentArrears)->sum('fine'),
                ];
            }
        }

        return response()->json($arrearsList);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $fees = Fee::where('rt_id', $request->user()->rt_id)->get();
        return response()->json($fees);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_mandatory' => 'boolean',
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $validated['rt_id'] = $request->user()->rt_id;

        $fee = Fee::create($validated);

        return response()->json($fee, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $fee = Fee::where('id', $id)->where('rt_id', request()->user()->rt_id)->firstOrFail();
        return response()->json($fee);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $fee = Fee::where('id', $id)->where('rt_id', $request->user()->rt_id)->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'description' => 'nullable|string',
            'is_mandatory' => 'boolean',
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $fee->update($validated);

        return response()->json($fee);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $fee = Fee::where('id', $id)->where('rt_id', request()->user()->rt_id)->firstOrFail();
        $fee->delete();

        return response()->json(['message' => 'Fee deleted successfully']);
    }
}
