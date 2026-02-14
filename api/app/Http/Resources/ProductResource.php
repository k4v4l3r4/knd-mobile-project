<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
                'photo_url' => $this->user->photo_url,
                'role' => $this->user->role,
                'rt_id' => $this->user->rt_id,
                'is_verified' => $this->store && $this->store->status === 'verified',
            ],
            'store' => $this->store ? [
                'id' => $this->store->id,
                'name' => $this->store->name,
                'status' => $this->store->status,
            ] : null,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'discount_price' => $this->discount_price,
            'category' => $this->category,
            'is_available' => $this->is_available,
            'image_url' => $this->image_url ? url('storage/' . $this->image_url) : null,
            'images' => $this->images ? collect($this->images)->map(fn($img) => url('storage/' . $img)) : [],
            'created_at' => $this->created_at,
            'whatsapp' => $this->whatsapp ?? $this->user->phone,
            'shopee_url' => $this->shopee_url,
            'tokopedia_url' => $this->tokopedia_url,
            'facebook_url' => $this->facebook_url,
            'instagram_url' => $this->instagram_url,
            'tiktok_url' => $this->tiktok_url,
        ];
    }
}
