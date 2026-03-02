<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SupportTicketController extends Controller
{
    public function index(Request $request)
    {
        $tickets = SupportTicket::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $tickets
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category' => 'required|string',
            'description' => 'required|string',
            'screenshot' => 'nullable|image|max:5120', // Max 5MB
            'role' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $screenshotPath = null;
        if ($request->hasFile('screenshot')) {
            $screenshotPath = $request->file('screenshot')->store('support-tickets', 'public');
        }

        $ticket = SupportTicket::create([
            'user_id' => $request->user()->id,
            'role' => $request->role ?? 'warga',
            'category' => $request->category,
            'description' => $request->description,
            'screenshot' => $screenshotPath,
            'status' => 'open',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan berhasil dikirim',
            'data' => $ticket
        ], 201);
    }
}
