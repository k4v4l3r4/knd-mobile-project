<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravolt\Indonesia\Models\Province;
use Laravolt\Indonesia\Models\City;
use Laravolt\Indonesia\Models\District;
use Laravolt\Indonesia\Models\Village;

class RegionController extends Controller
{
    public function provinces()
    {
        $provinces = Province::pluck('name', 'code');
        return response()->json([
            'success' => true,
            'data' => $provinces
        ]);
    }

    public function cities($provinceCode)
    {
        $cities = City::where('province_code', $provinceCode)->pluck('name', 'code');
        return response()->json([
            'success' => true,
            'data' => $cities
        ]);
    }

    public function districts($cityCode)
    {
        $districts = District::where('city_code', $cityCode)->pluck('name', 'code');
        return response()->json([
            'success' => true,
            'data' => $districts
        ]);
    }

    public function villages($districtCode)
    {
        $villages = Village::where('district_code', $districtCode)->pluck('name', 'code');
        return response()->json([
            'success' => true,
            'data' => $villages
        ]);
    }
}
