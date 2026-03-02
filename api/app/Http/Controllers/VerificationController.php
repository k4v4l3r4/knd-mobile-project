<?php

namespace App\Http\Controllers;

use App\Models\Letter;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function verify($code)
    {
        $letter = Letter::with(['user', 'rt'])->where('verification_code', $code)->first();

        if (!$letter) {
            return view('verification.invalid');
        }

        return view('verification.valid', compact('letter'));
    }
}
