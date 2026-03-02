<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'rt_id' => $this->rt_id,
            'city' => $this->rt?->city,
            'name' => $this->name,
            'description' => $this->description,
            // Return relative path to let frontend handle base URL
            'image_url' => $this->image_url,
            'logo_url' => $this->logo_url,
            'status' => $this->status,
            'verified_at' => $this->verified_at,
            'category' => $this->category,
            'contact' => $this->contact,
            'address' => $this->address,
            'is_open' => $this->is_open,
            'operating_hours' => $this->operating_hours,
            'is_open_now' => $this->is_open_now,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'phone' => $this->user->phone,
                    'role' => $this->user->role,
                    'photo_url' => $this->user->photo_url,
                    'rt_id' => $this->user->rt_id
                ];
            }),
            'products' => ProductResource::collection($this->whenLoaded('products')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
