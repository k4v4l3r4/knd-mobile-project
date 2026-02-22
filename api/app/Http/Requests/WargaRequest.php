<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class WargaRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $regionFields = [
            'province_code',
            'city_code',
            'district_code',
            'village_code',
        ];

        $data = [];
        foreach ($regionFields as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $data[$field] = null;
            }
        }

        if (!empty($data)) {
            $this->merge($data);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $warga = $this->route('warga');
        // Check if we are updating (PUT/PATCH) or creating (POST)
        // If updating, $warga is the ID string (from route parameter).
        // If creating, $warga is null.
        $userId = $warga;

        $isCreate = $this->isMethod('post');
        $requiredOnCreate = $isCreate ? 'required' : 'nullable';

        $provinceExistsRule = Schema::hasTable('indonesia_provinces') ? 'exists:indonesia_provinces,code' : 'nullable';
        $cityExistsRule = Schema::hasTable('indonesia_cities') ? 'exists:indonesia_cities,code' : 'nullable';
        $districtExistsRule = Schema::hasTable('indonesia_districts') ? 'exists:indonesia_districts,code' : 'nullable';
        $villageExistsRule = Schema::hasTable('indonesia_villages') ? 'exists:indonesia_villages,code' : 'nullable';

        return [
            'name' => ['required', 'string', 'max:255'],
            'nik' => [
                'required', 
                'string', 
                'size:16', 
            ],
            'kk_number' => [$requiredOnCreate, 'string', 'size:16'],
            'phone' => [
                'nullable', 
                'string', 
                'max:20', 
                Rule::unique('users', 'phone')->ignore($userId),
            ],
            'email' => [
                'nullable', 
                'string', 
                'email', 
                'max:255', 
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'rt_id' => ['nullable', 'exists:wilayah_rt,id'],
            'rw_id' => ['nullable', 'exists:wilayah_rw,id'],
            'is_bansos_eligible' => ['boolean'],
            'address' => ['nullable', 'string'],
            'block' => ['nullable', 'string', 'max:10'],
            'gang' => ['nullable', 'string', 'max:50'],
            'address_rt' => [$requiredOnCreate, 'string', 'max:5'],
            'address_rw' => [$requiredOnCreate, 'string', 'max:5'],
            'address_ktp' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'gender' => ['nullable', 'in:L,P'],
            'place_of_birth' => [$requiredOnCreate, 'string'],
            'date_of_birth' => [$requiredOnCreate, 'date'],
            'religion' => ['nullable', 'string'],
            'marital_status' => ['nullable', 'in:BELUM_KAWIN,KAWIN,CERAI_HIDUP,CERAI_MATI'],
            'occupation' => ['nullable', 'string'],
            'status_in_family' => ['nullable', 'in:KEPALA_KELUARGA,ISTRI,ANAK,FAMILI_LAIN'],
            'life_status' => ['nullable', 'in:ALIVE,DECEASED'],
            'ktp_image' => ['nullable', 'image', 'max:2048'], // Max 2MB
            'kk_image' => ['nullable', 'image', 'max:2048'], // Max 2MB
            'province_code' => [$requiredOnCreate, 'string', 'size:2', $provinceExistsRule],
            'city_code' => [$requiredOnCreate, 'string', 'size:4', $cityExistsRule],
            'district_code' => [$requiredOnCreate, 'string', $districtExistsRule],
            'village_code' => [$requiredOnCreate, 'string', 'size:10', $villageExistsRule],
        ];
    }

    public function messages(): array
    {
        return [
            'province_code.size' => 'Kode provinsi tidak valid.',
            'city_code.size' => 'Kode kota/kabupaten tidak valid.',
            'district_code.exists' => 'Kecamatan tidak ditemukan di database wilayah. Silakan pilih ulang.',
            'village_code.size' => 'Kelurahan tidak valid. Silakan pilih dari daftar.',
            'village_code.exists' => 'Kelurahan tidak ditemukan di database wilayah.',
        ];
    }
}
