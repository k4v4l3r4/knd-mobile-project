<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WargaRequest extends FormRequest
{
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

        return [
            'name' => ['required', 'string', 'max:255'],
            'nik' => [
                'required', 
                'string', 
                'size:16', 
            ],
            'kk_number' => ['nullable', 'string', 'size:16'],
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
            'address_rt' => ['nullable', 'string', 'max:5'],
            'address_rw' => ['nullable', 'string', 'max:5'],
            'address_ktp' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'gender' => ['nullable', 'in:L,P'],
            'place_of_birth' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
            'religion' => ['nullable', 'string'],
            'marital_status' => ['nullable', 'in:BELUM_KAWIN,KAWIN,CERAI_HIDUP,CERAI_MATI'],
            'occupation' => ['nullable', 'string'],
            'status_in_family' => ['nullable', 'in:KEPALA_KELUARGA,ISTRI,ANAK,FAMILI_LAIN'],
            'ktp_image' => ['nullable', 'image', 'max:2048'], // Max 2MB
            'kk_image' => ['nullable', 'image', 'max:2048'], // Max 2MB
            'province_code' => ['nullable', 'string', 'size:2', 'exists:indonesia_provinces,code'],
            'city_code' => ['nullable', 'string', 'size:4', 'exists:indonesia_cities,code'],
            'district_code' => ['nullable', 'string', 'size:7', 'exists:indonesia_districts,code'],
            'village_code' => ['nullable', 'string', 'size:10', 'exists:indonesia_villages,code'],
        ];
    }
}
