<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;

class EmergencyContactController extends Controller
{
    public function index()
    {
        $contacts = EmergencyContact::all();
        return response()->json([
            'success' => true,
            'data' => $contacts
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'number' => 'required|string',
            'type' => 'required|string',
        ]);

        $contact = EmergencyContact::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Kontak darurat berhasil ditambahkan',
            'data' => $contact
        ], 201);
    }

    public function destroy($id)
    {
        $contact = EmergencyContact::findOrFail($id);
        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kontak darurat dihapus'
        ]);
    }
}
