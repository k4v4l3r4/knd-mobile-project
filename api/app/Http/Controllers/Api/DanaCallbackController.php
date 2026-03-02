<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

class DanaCallbackController extends Controller
{
    public function handle(Request $request)
    {
        $publicKeyRaw = env('DANA_PUBLIC_KEY');
        if (!$publicKeyRaw) {
            return response()->json(['message' => 'Public key not configured'], 500);
        }

        $signatureHeader = $request->header('X-SIGNATURE');
        if (!$signatureHeader) {
            return response()->json(['message' => 'Missing signature'], 400);
        }

        $publicKey = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(str_replace(["\r", "\n", ' '], '', $publicKeyRaw), 64, "\n") . "-----END PUBLIC KEY-----\n";

        $payload = $request->getContent();
        $signature = base64_decode($signatureHeader, true);

        if ($signature === false) {
            return response()->json(['message' => 'Invalid signature encoding'], 400);
        }

        $verified = openssl_verify($payload, $signature, $publicKey, OPENSSL_ALGO_SHA256) === 1;

        if (!$verified) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $data = $request->all();

        $statusCode = $data['status'] ?? ($data['statusCode'] ?? null);
        $merchantTransId = $data['merchantTransId'] ?? null;
        $referenceNo = $data['referenceNo'] ?? null;

        if (!$merchantTransId && !$referenceNo) {
            return response()->json(['message' => 'Missing reference'], 400);
        }

        $transaction = null;

        if ($merchantTransId && str_starts_with($merchantTransId, 'IURAN-')) {
            $parts = explode('-', $merchantTransId);
            $id = end($parts);
            if (is_numeric($id)) {
                $transaction = Transaction::find((int) $id);
            }
        }

        if (!$transaction && $referenceNo) {
            $transaction = Transaction::where('dana_reference_no', $referenceNo)->first();
        }

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        if ($statusCode === '00') {
            $transaction->status = 'PAID';
            if ($referenceNo && !$transaction->dana_reference_no) {
                $transaction->dana_reference_no = $referenceNo;
            }
            $transaction->save();
        }

        return response()->json(['message' => 'OK']);
    }
}

