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
        $labels = is_array($this->labels) ? $this->labels : [];
        $isHalal = in_array('HALAL', $labels, true);
        $isBpom = in_array('BPOM', $labels, true);

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
                'rt_id' => $this->store->rt_id,
                'city' => $this->store->rt?->city,
                'name' => $this->store->name,
                'status' => $this->store->status,
                'is_open' => $this->store->is_open,
                'operating_hours' => $this->store->operating_hours,
                'is_open_now' => $this->store->is_open_now,
            ] : null,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'discount_price' => $this->discount_price,
            'category' => $this->category,
            'stock' => $this->stock,
            'shipping_type' => $this->shipping_type,
            'shipping_fee_flat' => $this->shipping_fee_flat,
            'variant_note' => $this->variant_note,
            'specifications' => $this->specifications,
            'labels' => $labels,
            'is_halal' => $isHalal,
            'is_bpom' => $isBpom,
            'is_available' => $this->is_available,
            // Return relative path to let frontend handle base URL
            'image_url' => $this->image_url,
            'images' => $this->images,
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
