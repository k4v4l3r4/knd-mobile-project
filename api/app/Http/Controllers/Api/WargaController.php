<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WargaRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

class WargaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Include all types of warga
        $query = User::whereIn('role', ['WARGA', 'WARGA_TETAP', 'WARGA_KOST']);

        // Filter by user's RT
        if ($user && $user->rt_id) {
            $query->where('rt_id', $user->rt_id);
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $perPage = $request->input('per_page', 10);
        // If per_page is 'all', get all results
        if ($request->input('all') === 'true') {
            $wargas = $query->get();
            // Wrap in resource structure to match pagination format if needed, or just return data
             return response()->json([
                'success' => true,
                'message' => 'List data warga',
                'data' => $wargas
            ]);
        }
        
        $wargas = $query->paginate($perPage);
        
        // Make NIK visible for admin
        $wargas->getCollection()->each(function ($warga) {
            $warga->makeVisible('nik');
        });

        return response()->json([
            'success' => true,
            'message' => 'List data warga',
            'data' => $wargas
        ]);
    }

    /**
     * Get family members of the current user.
     */
    public function family(Request $request)
    {
        $user = $request->user();
        
        if (!$user->kk_number) {
            return response()->json([
                'success' => true,
                'message' => 'Data keluarga tidak ditemukan (Nomor KK belum diatur)',
                'data' => []
            ]);
        }

        $family = User::where('kk_number', $user->kk_number)
                        ->orderByRaw("FIELD(status_in_family, 'KEPALA_KELUARGA', 'ISTRI', 'ANAK', 'FAMILI_LAIN')")
                        ->get();

          // Make NIK visible for family view
          $family->each(function ($member) {
              $member->makeVisible('nik');
          });

          return response()->json([
            'success' => true,
            'message' => 'Data keluarga berhasil diambil',
            'data' => $family
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(WargaRequest $request)
    {
        $validated = $request->validated();

        // Set default values
        $validated['password'] = Hash::make('12345678');
        $validated['role'] = 'WARGA';

        // Handle File Uploads
        if ($request->hasFile('ktp_image')) {
            $path = $request->file('ktp_image')->store('ktp_images', 'public');
            $validated['ktp_image_path'] = $path;
        }

        if ($request->hasFile('kk_image')) {
            $path = $request->file('kk_image')->store('kk_images', 'public');
            $validated['kk_image_path'] = $path;
        }

        // Remove file objects from validated array
        unset($validated['ktp_image']);
        unset($validated['kk_image']);

        $warga = User::create($validated);
        $warga->makeVisible('nik');

        return response()->json([
            'success' => true,
            'message' => 'Data warga berhasil ditambahkan',
            'data' => $warga
        ], 201);
    }

    /**
     * Export Data Warga to CSV
     */
    public function export(Request $request)
    {
        $fileName = 'data_warga_' . date('Y-m-d_H-i-s') . '.csv';
        $wargas = User::where('role', 'WARGA')->get();

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = [
            'Nama Lengkap', 
            'NIK', 
            'Nomor KK', 
            'No. Telepon / WA', 
            'Jenis Kelamin (L/P)', 
            'Tempat Lahir', 
            'Tanggal Lahir (YYYY-MM-DD)', 
            'Agama', 
            'Status Perkawinan', 
            'Pekerjaan', 
            'Status dalam Keluarga', 
            'Alamat Domisili',
            'Alamat KTP',
            'Blok',
            'RT',
            'RW',
            'Kode Pos'
        ];

        $callback = function() use($wargas, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($wargas as $warga) {
                // Decrypt if necessary or access raw
                $row = [
                    $warga->name,
                    $warga->nik, // Ensure this is visible/decrypted
                    $warga->kk_number,
                    $warga->phone,
                    $warga->gender,
                    $warga->place_of_birth,
                    $warga->date_of_birth,
                    $warga->religion,
                    $warga->marital_status,
                    $warga->occupation,
                    $warga->status_in_family,
                    $warga->address
                ];

                fputcsv($file, $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Import Data Warga from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048'
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data); // Remove header row

        // Expected columns mapping (index based on Export columns)
        // 0:Name, 1:NIK, 2:KK, 3:Phone, 4:Gender, 5:Place, 6:Date, 7:Religion, 8:Marital, 9:Job, 10:StatusFam, 11:Address, 12:AddressKTP, 13:Block, 14:RT, 15:RW, 16:PostalCode

        $successCount = 0;
        $errors = [];

        foreach ($data as $index => $row) {
            if (count($row) < 4) continue; // Skip empty/invalid rows

            try {
                $nik = $row[1] ?? null;
                if (!$nik) continue;

                // Check if user exists
                $user = User::where('nik', $nik)->first();

                $userData = [
                    'name' => $row[0],
                    'nik' => $row[1],
                    'kk_number' => $row[2] ?? null,
                    'phone' => $row[3] ?? null,
                    'gender' => $row[4] ?? 'L',
                    'place_of_birth' => $row[5] ?? null,
                    'date_of_birth' => $row[6] ?? null,
                    'religion' => $row[7] ?? 'ISLAM',
                    'marital_status' => $row[8] ?? 'BELUM_KAWIN',
                    'occupation' => $row[9] ?? null,
                    'status_in_family' => $row[10] ?? 'ANGGOTA_KELUARGA',
                    'address' => $row[11] ?? null,
                    'address_ktp' => $row[12] ?? null,
                    'block' => $row[13] ?? null,
                    'address_rt' => $row[14] ?? null,
                    'address_rw' => $row[15] ?? null,
                    'postal_code' => $row[16] ?? null,
                    'role' => 'WARGA',
                    'rt_id' => $request->user()->rt_id ?? 1, // Default to admin's RT or 1
                ];

                if ($user) {
                    // Update
                    $user->update($userData);
                } else {
                    // Create
                    $userData['password'] = Hash::make('12345678'); // Default password
                    User::create($userData);
                }
                $successCount++;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Import processed: $successCount items success.",
            'errors' => $errors
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $warga = User::with('family')->where('role', 'WARGA')->find($id);

        if (!$warga) {
            return response()->json([
                'success' => false,
                'message' => 'Data warga tidak ditemukan',
                'data' => null
            ], 404);
        }

        $warga->makeVisible('nik');
        
        // Also make NIK visible for family members
        if ($warga->family) {
            $warga->family->each(function ($member) {
                $member->makeVisible('nik');
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail data warga',
            'data' => $warga
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(WargaRequest $request, string $id)
    {
        $warga = User::where('role', 'WARGA')->find($id);

        if (!$warga) {
            return response()->json([
                'success' => false,
                'message' => 'Data warga tidak ditemukan',
                'data' => null
            ], 404);
        }

        $validated = $request->validated();
        
        // Handle File Uploads
        if ($request->hasFile('ktp_image')) {
            // Delete old file if exists
            if ($warga->ktp_image_path) {
                Storage::disk('public')->delete($warga->ktp_image_path);
            }
            $path = $request->file('ktp_image')->store('ktp_images', 'public');
            $validated['ktp_image_path'] = $path;
        }

        if ($request->hasFile('kk_image')) {
            // Delete old file if exists
            if ($warga->kk_image_path) {
                Storage::disk('public')->delete($warga->kk_image_path);
            }
            $path = $request->file('kk_image')->store('kk_images', 'public');
            $validated['kk_image_path'] = $path;
        }

        // Remove file objects from validated array
        unset($validated['ktp_image']);
        unset($validated['kk_image']);
        
        $warga->update($validated);
        $warga->makeVisible('nik');

        return response()->json([
            'success' => true,
            'message' => 'Data warga berhasil diperbarui',
            'data' => $warga
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $warga = User::where('role', 'WARGA')->find($id);

        if (!$warga) {
            return response()->json([
                'success' => false,
                'message' => 'Data warga tidak ditemukan',
                'data' => null
            ], 404);
        }

        // Delete files
        if ($warga->ktp_image_path) {
            Storage::disk('public')->delete($warga->ktp_image_path);
        }
        if ($warga->kk_image_path) {
            Storage::disk('public')->delete($warga->kk_image_path);
        }

        $warga->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data warga berhasil dihapus',
            'data' => null
        ]);
    }
}
