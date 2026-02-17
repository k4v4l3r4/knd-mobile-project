<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WargaRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
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

        // Include warga + admin RT sebagai bagian dari data warga
        $query = User::where(function ($q) {
            $q->whereIn('role', ['WARGA', 'WARGA_TETAP', 'WARGA_KOST'])
              ->orWhereIn('role', ['ADMIN_RT', 'RT']);
        });

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

        $optionalColumns = [
            'province_code',
            'city_code',
            'district_code',
            'village_code',
        ];

        foreach ($optionalColumns as $column) {
            if (array_key_exists($column, $validated) && !Schema::hasColumn('users', $column)) {
                unset($validated[$column]);
            }
        }

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

        $rows = file($path);
        if ($rows === false || count($rows) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'File CSV kosong atau tidak dapat dibaca',
            ], 422);
        }

        $firstLine = $rows[0];
        $commaCount = substr_count($firstLine, ',');
        $semicolonCount = substr_count($firstLine, ';');
        $delimiter = $semicolonCount > $commaCount ? ';' : ',';

        $data = array_map(function ($line) use ($delimiter) {
            return str_getcsv($line, $delimiter);
        }, $rows);

        $header = array_shift($data); // Remove header row

        $columnNames = [
            0 => 'Nama',
            1 => 'NIK',
            2 => 'Nomor KK',
            3 => 'No HP',
            4 => 'Jenis Kelamin',
            5 => 'Tempat Lahir',
            6 => 'Tanggal Lahir',
            7 => 'Agama',
            8 => 'Status Perkawinan',
            9 => 'Pekerjaan',
            10 => 'Status Keluarga',
            11 => 'Alamat Domisili',
            12 => 'Alamat KTP',
            13 => 'Blok',
            14 => 'RT',
            15 => 'RW',
            16 => 'Kode Pos',
        ];

        $successCount = 0;
        $errors = [];

        $admin = $request->user();
        $rtId = $admin->rt_id;
        $rwId = $admin->rw_id;
        $tenantId = $admin->tenant_id ?? null;

        if (!$rtId) {
            return response()->json([
                'success' => false,
                'message' => 'Import hanya dapat dilakukan oleh Admin RT yang terhubung ke RT tertentu.',
            ], 422);
        }

        foreach ($data as $index => $row) {
            $rowNumber = $index + 2;
            $filledColumns = array_filter($row, function ($value) {
                return $value !== null && trim((string) $value) !== '';
            });

            if (count($filledColumns) === 0) {
                continue;
            }

            if (count($row) < 2) {
                $errors[] = "Baris $rowNumber: Jumlah kolom kurang. Minimal isi kolom Nama dan NIK.";
                continue;
            }

            $rowErrors = [];

            $name = trim($row[0] ?? '');
            $nik = trim($row[1] ?? '');
            $dateOfBirthRaw = trim($row[6] ?? '');
            $genderRaw = strtoupper(trim($row[4] ?? ''));

            if ($name === '') {
                $rowErrors[] = "Kolom 'Nama' wajib diisi";
            }

            if ($nik === '') {
                $rowErrors[] = "Kolom 'NIK' wajib diisi";
            }

            if ($dateOfBirthRaw !== '') {
                try {
                    Carbon::parse($dateOfBirthRaw);
                } catch (\Exception $e) {
                    $rowErrors[] = "Kolom 'Tanggal Lahir' tidak valid. Gunakan format YYYY-MM-DD (contoh 1990-02-17)";
                }
            }

            if ($genderRaw !== '' && !in_array($genderRaw, ['L', 'P'])) {
                $rowErrors[] = "Kolom 'Jenis Kelamin' harus diisi dengan L atau P";
            }

            if (!empty($rowErrors)) {
                $errors[] = "Baris $rowNumber: " . implode('; ', $rowErrors);
                continue;
            }

            try {
                $nik = $row[1] ?? null;
                if (!$nik) continue;

                // Check if user exists
                $user = User::where('nik', $nik)->first();

                $userData = [
                    'name' => $name,
                    'nik' => $nik,
                    'kk_number' => $row[2] ?? null,
                    'phone' => $row[3] ?? null,
                    'gender' => $genderRaw !== '' ? $genderRaw : 'L',
                    'place_of_birth' => $row[5] ?? null,
                    'date_of_birth' => $dateOfBirthRaw ?: null,
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
                    'rt_id' => $rtId,
                    'rw_id' => $rwId,
                    'tenant_id' => $tenantId,
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
                $errors[] = "Baris $rowNumber: " . $e->getMessage();
            }
        }

        if ($successCount === 0) {
            $previewErrors = array_slice($errors, 0, 3);
            $detailMessage = '';
            if (!empty($previewErrors)) {
                $detailMessage = ' Contoh kesalahan: ' . implode(' | ', $previewErrors);
            }

            return response()->json([
                'success' => false,
                'message' => 'Tidak ada baris yang berhasil diimport. Periksa kembali format kolom dan pemisah (gunakan koma atau titik koma).' . $detailMessage,
                'errors' => $errors,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => "Import berhasil: $successCount baris.",
            'errors' => $errors,
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
