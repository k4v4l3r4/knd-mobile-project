<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
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
            'rt_id' => $this->rt_id,
            'name' => $this->name,
            'description' => $this->description,
            'image_url' => $this->image_url ? (str_starts_with($this->image_url, 'http') || str_starts_with($this->image_url, 'storage/') ? $this->image_url : $this->image_url) : null,
            // Ensure relative path is clean for frontend concatenation if needed, 
            // but for now keeping as is since controller stores relative path.
            // Actually, let's make it return just the path segment if it's in storage.
            // 'image_url' => $this->image_url ? str_replace('public/', '', $this->image_url) : null,
            // Wait, store('assets', 'public') returns 'assets/xyz.jpg'.
            // So we just return it.
            'total_quantity' => $this->total_quantity,
            'available_quantity' => $this->available_quantity,
            'condition' => $this->condition,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
